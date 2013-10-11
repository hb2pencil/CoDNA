<?php

    $minWC = 5;
    $memoryFactor = 1.00;
    
    $revisions = array();
    $previousSentences = array();
    $users = array();
    $lastRevSentences = array();
    $relations = array();
    $ownership = array();

    /**
     * Returns an array of words from a sentence
     * @param string $sentence The sentence to get the words for
     * @return array an array of words from a sentence
     */
    function getWords($sentence){
        return preg_split('/[^a-zA-Z0-9]/i', $sentence, -1, PREG_SPLIT_NO_EMPTY);
    }
    
    /**
     * Returns an array of sections, where the sections are arrays of sentences
     * @param string $str The block of text to get the sentences from
     * @return array an array of sections
     */
    function getSections($str){
        global $article;
        $ret = array();
        $matches = array();
        preg_match_all("/=*SECTION=*.*=*!SECTION=*/i", $str, $matches);
        $sections = preg_split("/=*SECTION=*.*=*!SECTION=*/i", $str, -1, PREG_SPLIT_NO_EMPTY);
        $ret[] = array('title' => $article,
                       'text' => $sections[0]);
        if(isset($matches[0])){
            foreach($matches[0] as $key => $match){
                if(isset($sections[$key+1])){
                    $title = $match;
                    $ret[] = array('title' => $title,
                                   'text' => $sections[$key+1]);
                }
            }
        }
        return $ret;
    }
    
    /**
     * Returns an array of sentences, where the sentences are arrays of words
     * @param string $str The block of text to get the sentences from
     * @return array an array of sentences
     */
    function getSentences($str){
        global $article, $minWC;

        $str = str_replace("\\n", "\n", $str);
        $str = str_replace("<h1>", "=SECTION=", str_replace("</h1>", "=!SECTION=", $str));
        $str = str_replace("<h2>", "==SECTION==", str_replace("</h2>", "==!SECTION==", $str));
        $str = str_replace("<h3>", "===SECTION===", str_replace("</h3>", "===!SECTION===", $str));
        $str = str_replace("<h4>", "====SECTION====", str_replace("</h4>", "====!SECTION====", $str));
        $str = str_replace("<h5>", "=====SECTION=====", str_replace("</h5>", "=====!SECTION=====", $str));
        $str = str_replace("<h6>", "======SECTION======", str_replace("</h6>", "======!SECTION======", $str));
        $str = strip_tags($str);

        $sections = getSections($str);
        $re = '/# Split sentences on whitespace between them.
                (?<=                # Begin positive lookbehind.
                  [.!?]             # Either an end of sentence punct,
                | [.!?][\'"]        # or end of sentence punct and quote.
                | [\n]
                )                   # End positive lookbehind.
                (?<!                # Begin negative lookbehind.
                  Mr\.              # Skip either "Mr."
                | Mrs\.             # or "Mrs.",
                | Ms\.              # or "Ms.",
                | Jr\.              # or "Jr.",
                | Dr\.              # or "Dr.",
                | Prof\.            # or "Prof.",
                | Sr\.              # or "Sr.",
                | \s[A-Z]\.         # or initials ex: "George W. Bush",
                | i\.e\.            # or "i.e."
                                    # or... (you get the idea).
                )                   # End negative lookbehind.
                (\s+|\[.*\])                 # Split on whitespace between sentences.
                /ix';
        $finalSentences = array();
        foreach($sections as $section){
            $sentences = preg_split($re, $section['text'], -1, PREG_SPLIT_NO_EMPTY);
            foreach($sentences as $key => $sentence){
                $sentences[$key] = html_entity_decode(str_replace("\n", " ", $sentence));
            }
            foreach($sentences as $sentence){
                $words = getWords($sentence);
                $wc = count($words);
                if($wc >= $minWC){
                    $finalSentences[] = array('section' => preg_replace("/=*SECTION=*/", "", preg_replace("/=*!SECTION=*/", "", $section['title'])), 
                                              'sentence' => $sentence);
                }
            }
        }
        return $finalSentences;
    }
    
    /**
     * Determines which user owns the sentence (must own more than 50%)
     * @param array $words The sentence's words
     * @return mixed The name of the owner, or false if there is no user
     */
    function determineOwner($words){
        $users = array();
        $nWords = count($words);
        foreach($words as $word){
            @$users[$word['user']] += 1;
            if($users[$word['user']] > $nWords/2){
                return $word['user'];
            }
        }
        return false;
    }
    
    /**
     * Iterates through each word to look for insertions/deletions and tags each word by user
     * @param string $user The user who made the revision
     * @param array $sentence The last revision sentence
     * @param array $words The words array for process
     * @param int $nIns The number of insertions so far
     * @param int $nDel The number of deletions so far
     * @return array The array of words
     */
    function processWords($user, $sentence, $words, &$nIns, &$nDel){
        $finalWords = array();
        if(isset($sentence)){
            $lastWords = array();
            foreach($sentence['words'] as $word){
                $lastWords[] = $word['word'];
            }
            $wordDiff = diff($lastWords, $words);
            $wi = 0;
            foreach($wordDiff as $word){
                if(is_array($word)){
                    $wInsertion = $word['i'];
                    $wDeletion = $word['d'];
                    foreach($wInsertion as $wik => $wins){
                        $finalWords[] = array('word' => $wins,
                                              'user' => $user);
                        $nIns++;
                    }
                    if(count($wDeletion) > 0){
                        $wi += count($wDeletion);
                        $nDel++;
                    }
                }
                else{
                    // No Words Change
                    $finalWords[] = array('word' => $word,
                                          'user' => $sentence['words'][$wi]['user']);
                    $wi++;
                }
            }
            $words = $finalWords;
        }
        else{
            foreach($words as $wKey => $word){
                $words[$wKey] = array('word' => $word,
                                      'user' => $user);
            }
        }
        return $words;
    }
    
    /**
     * Appends the relations array with a relation of the given type
     * @param array $relations The relations array
     * @param string $user1 The user that will be relating to the other user
     * @param string $user2 The user that will be related to
     * @param string $newOwner The user who now owns the sentence
     * @param string $type The type of relation
     * @param int $revId The id of the revision
     * @param int $sentId The id of the sentence in this revision
     * @param int $wordsIns The number of words inserted in this sentence
     * @param int $wordsDel The number of words deleted in this sentence
     * @return array The relation array
     */
    function addRelation(&$relations, $user1, $user2, $newOwner, $type, $revId, $sentId, $wordsIns, $wordsDel, $section){
        $relation = array();
        if($user1 != $user2 && $user1 !== false && $user2 !== false){
            if(!isset($relations[$user1])){
                $relations[$user1] = array();
            }
            if(!isset($relations[$user1][$user2])){
                $relations[$user1][$user2] = array();
            }
            $relation = array('modifier' => $user1,
                               'owner' => $user2,
                               'type' => $type,
                               'attr' => array());
            $relation['attr'] = array('revId' => $revId,
                                      'section' => $section,
                                      'sentId' => $sentId,
                                      'wordsIns' => $wordsIns,
                                      'wordDel' => $wordsDel);
            if($type == "changes"){
                $relation['attr']['takesOwnership'] = ($newOwner == $user1);
            }
            $relations[$user1][$user2][] = $relation;
        }
        return $relation;
    }
    
    /**
     * Iterates through each sentence to and looks for insertions/deletions
     * @param id $revId The id of the revision being processed
     * @param string $user The user who made the revision
     * @param array $relations The array of relations
     * @param array $previousSentences The array of sentences for the previous revision
     * @param array $lastRevSentences The array of sentences (split up into words) for the previous revision
     * @param array $sentences The array of sentences for the current revision.
     * @return array The final array of sentences split up into words
     */
    function processSentences($revId, $user, &$relations, &$previousSentences, &$lastRevSentences, $sentences){
        $finalSentences = array();
        $previousArray = array();
        $sentenceArray = array();
        foreach($previousSentences as $sentence){
            $previousArray[] = $sentence['sentence'];
        }
        foreach($sentences as $sentence){
            $sentenceArray[] = $sentence['sentence'];
        }
        $diff = diff($previousArray, $sentenceArray);
        $nInserts = 0;
        $i = 0;
        $key = 0;
        foreach($diff as $sentence){
            if(is_array($sentence)){
                $insertion = $sentence['i'];
                $deletion = $sentence['d'];
                if(count($insertion) > 0){
                    // Insertion
                    foreach($insertion as $ins){
                        $section = $sentences[$key]['section'];
                        $wordsIns = 0;
                        $wordsDel = 0;
                        $words = processWords($user, @$lastRevSentences[$i], getWords($ins), $wordsIns, $wordsDel);
                        $owner = determineOwner($words);
                        $finalSentences[] = array('section' => $section,
                                                  'words' => $words,
                                                  'raw' => $ins,
                                                  'user' => $owner);
                        if(isset($lastRevSentences[$i])){
                            addRelation($relations,
                                        $user,
                                        $lastRevSentences[$i]['user'],
                                        $owner,
                                        "changes",
                                        $revId,
                                        count($finalSentences)-1,
                                        $wordsIns,
                                        $wordsDel,
                                        $section);
                        }
                        if(isset($lastRevSentences[$i-1]) && 
                           $owner == $user && $wordsDel == 0 && 
                           $lastRevSentences[$i-1]['section'] == $section){
                            addRelation($relations,
                                        $owner,
                                        $lastRevSentences[$i-1]['user'],
                                        $owner,
                                        "adds_after",
                                        $revId,
                                        count($finalSentences)-1,
                                        $wordsIns,
                                        $wordsDel,
                                        $section);
                        }
                        if(isset($lastRevSentences[$i+1]) && 
                           $owner == $user && $wordsDel == 0 && 
                           $lastRevSentences[$i+1]['section'] == $section){
                            addRelation($relations,
                                        $owner,
                                        $lastRevSentences[$i+1]['user'],
                                        $owner,
                                        "adds_before",
                                        $revId,
                                        count($finalSentences)-1,
                                        $wordsIns,
                                        $wordsDel,
                                        $section);
                        }
                        $key++;
                    }
                }
                if(count($deletion) > 0){
                    $i += count($deletion);
                    $key--;
                }
            }
            else{
                // No Sentence Change
                $finalSentences[] = $lastRevSentences[$i];
                $i++;
                $key++;
            }
        }
        $lastRevSentences = $finalSentences;
        $previousSentences = $sentences;
        return $finalSentences;
    }
?>
