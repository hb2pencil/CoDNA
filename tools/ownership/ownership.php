<?php

    $article = "Lagrangian_mechanics";
    $minWC = 5;

    function diff($old, $new){
        $maxlen = 0;
        foreach($old as $oindex => $ovalue){ 
                $nkeys = array_keys($new, $ovalue); 
                foreach($nkeys as $nindex){ 
                        $matrix[$oindex][$nindex] = isset($matrix[$oindex - 1][$nindex - 1]) ? 
                                $matrix[$oindex - 1][$nindex - 1] + 1 : 1; 
                        if($matrix[$oindex][$nindex] > $maxlen){ 
                                $maxlen = $matrix[$oindex][$nindex]; 
                                $omax = $oindex + 1 - $maxlen; 
                                $nmax = $nindex + 1 - $maxlen;
                        } 
                }        
        } 
        if($maxlen == 0) return array(array('d'=>$old, 'i'=>$new)); 
        return array_merge(
                diff(array_slice($old, 0, $omax), array_slice($new, 0, $nmax)), 
                array_slice($new, $nmax, $maxlen), 
                diff(array_slice($old, $omax + $maxlen), array_slice($new, $nmax + $maxlen))); 
    }
    
    // Returns an array of words from a sentence
    function getWords($sentence){
        $words = preg_split('/[^a-zA-Z0-9]/i', $sentence);
        $finalWords = array();
        foreach($words as $word){
            if($word != "" && $word != " "){
                $finalWords[] = $word;           }
        }
        return $finalWords;
    }
    
    // Returns an array of sentences, where the sentences are arrays of words
    function getSentences($str){
        global $article, $minWC;
        $str = str_replace("\\n", "\n", $str);
        $str = strip_tags($str);

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
        
        $sentences = preg_split($re, $str, -1, PREG_SPLIT_NO_EMPTY);
        foreach($sentences as $key => $sentence){
            $sentences[$key] = html_entity_decode(str_replace("\n", " ", $sentence));
        }
        $finalSentences = array();
        foreach($sentences as $sentence){
            $words = array();
            $words_tmp = getWords($sentence);
            foreach($words_tmp as $word){
                if($word != ""){
                    $words[] = $word;
                }
            }
            $wc = count($words);
            if($wc >= $minWC){
                $finalSentences[] = $words;
            }
        }
        return $sentences;
    }
    
    $rev_history = json_decode(file_get_contents("https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=$article&rvlimit=max&rvprop=user|ids|timestamp&format=json&rvdir=newer"));
    $pages = (array)$rev_history->query->pages;
    $revisions = array();
    $done = false;
    $lastrevid = 0;  
    while(!$done){
        foreach($pages as $page){
            if(isset($page->revisions)){
                foreach($page->revisions as $rev){
                    $revisions[$rev->timestamp] = $rev;
                    $lastrevid = $rev->revid;
                }
            }
            else{
                $done = true;
                break;
            }
        }
        if(!$done){
            $rev_history = json_decode(file_get_contents("https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=$article&rvlimit=max&rvprop=user|ids|timestamp&format=json&rvdir=newer&rvstartid=".($lastrevid+1)));
            $pages = (array)$rev_history->query->pages;
        }
    }
    ksort($revisions);
    $previousSentences = array();
    
    $users = array();
    $lastRevSentences = array();
    foreach($revisions as $timestamp => $rev){
        $users[$rev->user] = $rev->user;
        $revid = $rev->revid;
        $finalSentences = array();
        $user = $rev->user;
        $cache = "cache/{$article}_{$revid}";
        if(file_exists($cache)){
            $json = json_decode(file_get_contents($cache));
        }
        else{
            if(!is_dir("cache")){
                mkdir("cache");
            }
            $json = file_get_contents("http://en.wikipedia.org/w/api.php?action=parse&prop=text&page=$article&oldid=$revid&format=json");
            file_put_contents($cache, $json);
            $json = json_decode($json);
        }
        $text = (array)$json->parse->text;
        $str = $text['*'];
        $sentences = getSentences($str);

        $diff = diff($previousSentences, $sentences);
        $nInserts = 0;
        $i = 0;
        foreach($diff as $sentence){
            if(is_array($sentence)){
                $insertion = $sentence['i'];
                $deletion = $sentence['d'];
                foreach($insertion as $ik => $ins){
                    $words = getWords($ins);
                    $finalWords = array();
                    if(isset($lastRevSentences[$i])){
                        $lastWords = array();
                        foreach($lastRevSentences[$i] as $word){
                            $lastWords[] = $word['word'];
                        }
                        $wordDiff = diff($lastWords, $words);
                        $wi = 0;
                        foreach($wordDiff as $key => $word){
                            if(is_array($word)){
                                $wInsertion = $word['i'];
                                $wDeletion = $word['d'];
                                foreach($wInsertion as $wik => $wins){
                                    $finalWords[] = array('word' => $wins,
                                                          'user' => $user);
                                }
                                foreach($wDeletion as $del){
                                    $wi++;
                                }
                            }
                            else{
                                // No Words Change
                                $finalWords[] = array('word' => $word,
                                                      'user' => $lastRevSentences[$i][$wi]['user']);
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
                    $finalSentences[] = $words;
                }
                foreach($deletion as $del){
                    $i++;
                }
            }
            else{
                // No Sentence Change
                $words = getWords($sentence);
                foreach($words as $wKey => $word){
                    $words[$wKey] = array('word' => $word, 
                                          'user' => $lastRevSentences[$i][$wKey]['user']);
                }
                $finalSentences[] = $words;
                $i++;
            }
        }
        

        $lastRevSentences = $finalSentences;
        $previousSentences = $sentences;
        
        echo "== REVID $revid - $timestamp ==\n";
        $ownership = array();
        foreach($users as $u){
            $sentenceCount = 0;
            foreach($finalSentences as $sentence){
                $nWords = count($sentence);
                $wordCount = 0;
                foreach($sentence as $word){
                    if($word['user'] == $u){
                        $wordCount++;
                    }
                }
                if($wordCount > $nWords/2){
                    $sentenceCount++;
                }
            }
            $ownership[$u] = $sentenceCount;
        }
        asort($ownership);
        $ownership = array_reverse($ownership);
        $percentSum = 0;
        $nSentences = count($sentences);
        foreach($ownership as $u => $sentenceCount){
            $percent = ($sentenceCount/max(1,$nSentences))*100;
            echo "$u: ".number_format($percent, 3)."%\n";
            $percentSum += $percent;
        }
        $publicDomain = abs(100 - $percentSum);
        echo "Public Domain: ".number_format($publicDomain, 3)."%\n";
        echo "\n";
    }

?>
