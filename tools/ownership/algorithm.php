<?php

    $minWC = 5;
    $memoryFactor = 0.95;
    
    $revisions = array();
    $previousSentences = array();
    $users = array();
    $lastRevSentences = array();
    $relations = array();
    $ownership = array();
    
    // Array of all the sentences in the order that they were added.
    // Each entry in the array is another array of tuples for that sentence (revId, sentId, section)
    $sentenceHistory = array(); 

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
        $str = str_replace(".<", ". <", $str);
        //$str = strip_tags($str);

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
                | et\sal\.          # or "et al."
                | c\.f\. | cf\.     # or "c.f." (compared to)
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
                    $finalSentences[] = array('section' => preg_replace("/=*SECTION=*/", "", preg_replace("/=*!SECTION=*/", "", strip_tags($section['title']))), 
                                              'sentence' => trim($sentence));
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
                        $nDel += count($wDeletion);
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
     * @param int $historyId The id of the sentence in the sentenceHistory array
     * @param int $relHistoryId The id of the related sentence in the sentenceHistory array
     * @return array The relation array
     */
    function addRelation(&$relations, $user1, $user2, $newOwner, $type, $revId, $sentId, $wordsIns, $wordsDel, $section, $historyId, $relHistoryId){
        global $sentenceHistory;
        $relation = array();
        if($user1 !== false && $user2 !== false){
            if(!isset($relations[$user1])){
                $relations[$user1] = array();
            }
            if(!isset($relations[$user1][$user2])){
                $relations[$user1][$user2] = array();
            }
            $relation = array('modifier' => $user1,
                              'owner' => $user2,
                              'type' => $type,
                              'section' => $section,
                              'sentId' => $sentId,
                              'wordsIns' => $wordsIns,
                              'wordsDel' => $wordsDel,
                              'takesOwnership' => true,
                              'history' => array(),
                              'relHistory' => array());
            if($type == "changes"){
                $relation['takesOwnership'] = ($newOwner == $user1);
            }
            if(isset($sentenceHistory[$historyId])){
                $relation['history'] = $sentenceHistory[$historyId][count($sentenceHistory[$historyId])-1];
            }
            if(isset($sentenceHistory[$relHistoryId])){
                $relation['relHistory'] = $sentenceHistory[$relHistoryId][0];
            }
            $relations[$user1][$user2][] = $relation;
        }
        return $relation;
    }
    
    /**
     * Appends the sentence revision to the sentenceHistory array.  
     * If $histId >= 0 then it is appended to the revision information for that sentence
     * @param int $revId The id of the revision
     * @param String $section The section name for the sentence
     * @param int $sentId The id of the sentence
     * @param string $raw The raw sentence text
     * @param int $histId If $histId >= 0 then it is appended to the revision information for that sentence
     * @return int The sentenceHistory Id
     */
    function addSentenceHistory($revId, $section, $sentId, $raw, $histId=-1){
        global $sentenceHistory;
        if($histId == -1){
            $histId = count($sentenceHistory);
            $history = array();
        }
        else{
            $history = &$sentenceHistory[$histId];
        }
        $index = count($history)-1;
        if($index >= 0 && isset($history[$index]) && $history[$index]['raw'] == $raw && $history[$index]['revId'] != $revId){
            // No change, so just update the values
            $history[$index]['revId'] = $revId;
            $history[$index]['section'] = $section;
            $history[$index]['sentId'] = $sentId;
            return $histId;
        }
        $history[] = array('revId' => $revId, 
                           'section' => $section,
                           'sentId' => $sentId,
                           'raw' => $raw);
        $sentenceHistory[$histId] = $history;
        return $histId;
    }
    
    /**
     * Returns the historic sentence tuple for the given text
     * @param String $sentence The text for the sentence to match
     * @param integer $sentId The id of the sentence in the current revision.  
     * This is used so that if the algorithim finds two identical sentences, it will 'prefer' the one which is closest to it.
     */
    function findSentenceInHistory($sentence, $sentId=0){
        global $sentenceHistory;
        $offset = 1;
        do {
            $found = false;
            $closestDiff = 9999999999;
            $closest = -1;
            foreach($sentenceHistory as $key => $history){
                if(isset($history[count($history)-$offset])){
                    $found = true;
                    $tuple = $history[count($history)-$offset];
                    if($tuple['raw'] == $sentence && abs($tuple['sentId'] - $sentId) < $closestDiff){
                        $closestDiff = abs($tuple['sentId'] - $sentId);
                        $closest = $key;
                    }
                }
            }
            if($closest > -1){
                return $closest;
            }
            $offset++;
        } while($found);
        return -1;
    }
    
    /**
     * Iterates through each sentence to and looks for insertions/deletions
     * @param id $revId The id of the revision being processed
     * @param string $user The user who made the revision
     * @param array $relations The array of relations
     * @param array $previousSentences The array of sentences for the previous revision
     * @param array $lastRevSentences The array of sentences (split up into words) for the previous revision
     * @param array $sentences The array of sentences for the current revision.
     * @param array $storedSentences The array of sentences which are currently stored in the DB
     * @param boolean $isVandal Whether or not this was a vandalism revision (or a undo vandalism)
     * @return array The final array of sentences split up into words
     */
    function processSentences($revId, $user, &$relations, &$previousSentences, &$lastRevSentences, $sentences, $storedSentences, $isVandal=false){
        global $sentenceHistory;
        $finalSentences = array();
        $previousArray = array();
        $sentenceArray = array();
        $sectionCache = array();
        foreach($lastRevSentences as $key => $sentence){
            if($sentence['raw'] == ""){
                unset($lastRevSentences[$key]);
            }
        }
        $lastRevSentences = array_values($lastRevSentences);
        foreach($previousSentences as $sentence){
            if($sentence['sentence'] != ""){
                $previousArray[] = $sentence['sentence'];
            }
        }
        foreach($sentences as $sentence){
            $sentenceArray[] = $sentence['sentence'];
            $sectionCache[$sentence['sentence']][] = $sentence['section'];
        }
        $diff = diff($previousArray, $sentenceArray);
        $nInserts = 0;
        $nDeletes = 0;
        $i = 0;
        foreach($diff as $sentence){
            if(is_array($sentence)){
                $insertion = $sentence['i'];
                $deletion = $sentence['d'];
                if(count($insertion) > 0){
                    // Insertion
                    $nIns = 0;
                    foreach($insertion as $kIns => $ins){
                        $section = $sectionCache[$ins][0];
                        unset($sectionCache[$ins][0]);
                        $sectionCache[$ins] = array_values($sectionCache[$ins]);
                        $wordsIns = 0;
                        $wordsDel = 0;
                        if(isset($deletion[$kIns])){
                            // Changed sentence
                            $words = processWords($user, @$lastRevSentences[$i+$kIns], getWords($ins), $wordsIns, $wordsDel);
                        }
                        else{
                            // New sentence
                            $words = processWords($user, array('words' => array()), getWords($ins), $wordsIns, $wordsDel);
                        }
                        $owner = determineOwner($words);
                        $new_sentence = array('section' => $section,
                                              'words' => $words,
                                              'raw' => $ins,
                                              'user' => $owner,
                                              'last' => null);
                        $changes = false;
                        $adds_after = false;
                        $adds_before = false;
                        $adds_new = false;
                        
                        if(isset($lastRevSentences[$i+$kIns]) && isset($deletion[$kIns])){
                            // Changes
                            $id = findSentenceInHistory($lastRevSentences[$i+$kIns]['raw'], count($finalSentences) + $nDeletes - $nInserts);
                            $history = $sentenceHistory[$id][count($sentenceHistory[$id])-1];
                            $off = 2;
                            while($history['revId'] == $revId){
                                $history = @$sentenceHistory[$id][count($sentenceHistory[$id])-$off];
                                $off++;
                            }
                            $new_sentence['last'] = $storedSentences["{$history['revId']}_{$history['sentId']}"]->ID;
                            addSentenceHistory($revId, $section, count($finalSentences), $ins, $id);
                            $relId = $id;
                            addRelation($relations,
                                        $user,
                                        $lastRevSentences[$i+$kIns]['user'],
                                        $owner,
                                        "changes",
                                        $revId,
                                        count($finalSentences)-1,
                                        $wordsIns,
                                        $wordsDel,
                                        $section,
                                        $id,
                                        $relId);
                            $changes = true;
                        }
                        if(isset($lastRevSentences[$i-1+$kIns]) && 
                           $owner == $user && $wordsDel == 0 && 
                           $lastRevSentences[$i-1+$kIns]['section'] == $section && !isset($deletion[$kIns])){
                            // Adds After
                            $id = addSentenceHistory($revId, $section, count($finalSentences), $ins);
                            $relId = findSentenceInHistory($lastRevSentences[$i-1+$kIns]['raw'], count($finalSentences) + $nDeletes - $nInserts);
                            addRelation($relations,
                                        $owner,
                                        $lastRevSentences[$i-1+$kIns]['user'],
                                        $owner,
                                        "adds_after",
                                        $revId,
                                        count($finalSentences)-1,
                                        $wordsIns,
                                        $wordsDel,
                                        $section,
                                        $id,
                                        $relId);
                            $adds_after = true;
                            $nInserts++;
                        }
                        if(isset($lastRevSentences[$i+$kIns-$nIns]) && 
                           $owner == $user && $wordsDel == 0 && 
                           $lastRevSentences[$i+$kIns-$nIns]['section'] == $section && !isset($deletion[$kIns])){
                            // Adds Before
                            $id = addSentenceHistory($revId, $section, count($finalSentences), $ins);
                            $relId = findSentenceInHistory($lastRevSentences[$i+$kIns-$nIns]['raw'], count($finalSentences) + $nDeletes - $nInserts);
                            addRelation($relations,
                                        $owner,
                                        $lastRevSentences[$i+$kIns-$nIns]['user'],
                                        $owner,
                                        "adds_before",
                                        $revId,
                                        count($finalSentences)-1,
                                        $wordsIns,
                                        $wordsDel,
                                        $section,
                                        $id,
                                        $relId);
                            $nIns++;
                            $adds_before = true;
                            $nInserts++;
                        }
                        if(!$adds_before && !$adds_after && !$changes){
                            // Adds New
                            $id = addSentenceHistory($revId, $section, count($finalSentences), $ins);
                            addRelation($relations,
                                        $owner,
                                        "",
                                        $owner,
                                        "adds_new",
                                        $revId,
                                        count($finalSentences)-1,
                                        $wordsIns,
                                        $wordsDel,
                                        $section,
                                        $id,
                                        $id);
                            $adds_new = true;
                            $nInserts++;
                        }
                        $finalSentences[] = $new_sentence;
                    }
                }
                if(count($deletion) > count($insertion)){
                    // Deletion
                    foreach($deletion as $kDel => $del){
                        $wordsIns = 0;
                        $wordsDel = 0;
                        $words = processWords($user, $lastRevSentences[$i+$kDel], getWords(""), $wordsIns, $wordsDel);
                        $owner = determineOwner($words);
                        if(!isset($insertion[$kDel])){
                            $relId = findSentenceInHistory($lastRevSentences[$i+$kDel]['raw'], count($finalSentences) + $nDeletes - $nInserts);
                            $history = $sentenceHistory[$relId][count($sentenceHistory[$relId])-1];
                            $off = 2;
                            while($history['revId'] == $revId){
                                $history = @$sentenceHistory[$relId][count($sentenceHistory[$relId])-$off];
                                $off++;
                            }
                            $finalSentences[] = array('section' => $lastRevSentences[$i+$kDel]['section'],
                                                      'words' => $words,
                                                      'raw' => "",
                                                      'user' => $user,
                                                      //'last' => $storedSentences["{$history['revId']}_{$history['sentId']}"]->ID);
                                                      );
                            $id = addSentenceHistory($revId, $lastRevSentences[$i+$kDel]['section'], count($finalSentences)-1, $user, $relId);
                            addRelation($relations,
                                        $user,
                                        $lastRevSentences[$i+$kDel]['user'],
                                        $user,
                                        "deletes",
                                        $revId,
                                        count($finalSentences)-1,
                                        $wordsIns,
                                        $wordsDel,
                                        "",
                                        $id,
                                        $relId);
                            $nDeletes++;
                        }
                    }
                }
                if(count($deletion) > 0){
                    $i += count($deletion);
                }
            }
            else{
                // No Sentence Change
                $new_sentence = $lastRevSentences[$i];
                $relId = findSentenceInHistory($sentence, count($finalSentences) + $nDeletes - $nInserts);
                $count = count($sentenceHistory[$relId]);
                $history = $sentenceHistory[$relId][$count-1];
                $off = 2;
                while($history['revId'] == $revId && $count-$off >= 0){
                    $history = @$sentenceHistory[$relId][$count-$off];
                    $off++;
                }
                foreach($sentences as $sent){
                    if($sent['sentence'] == $sentence){
                        $new_sentence['section'] = $sent['section'];
                        break;
                    }
                }
                
                if(isset($storedSentences["{$history['revId']}_{$history['sentId']}"])){
                    $new_sentence['last'] = $storedSentences["{$history['revId']}_{$history['sentId']}"]->ID;
                }
                addSentenceHistory($revId, $new_sentence['section'], count($finalSentences), $lastRevSentences[$i]['raw'], $relId);
                
                $finalSentences[] = $new_sentence;
                $i++;
            }
        }
        if(!$isVandal){
            $lastRevSentences = $finalSentences;
            $previousSentences = $sentences;
        }
        return $finalSentences;
    }
?>
