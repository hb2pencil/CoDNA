<?php

    require_once("diff.php");
    require_once("algorithm.php");
    require_once("../../visualization/lib/config.inc.php");
    require_once("../../visualization/lib/DBConnection.inc.php");
    
    $mysqli = DBConnection::get()->handle();

    $set_table = "";

    $sql = "SELECT a.`page_title` as `article`, a.`article_id` as id
            FROM `articles` a, `articles_to_sets` s 
            WHERE s.`set_id` = '5'
            AND s.article_id = a.article_id";
    $articles = $mysqli->query($sql);
    
    $sql = "SELECT `set_table` as set_table
            FROM `articles_sets`
            WHERE set_id = '5'";
    $tables = $mysqli->query($sql);
    
    while ($table = $tables->fetch_object()) {
        $set_table = $table->set_table;
    }
    
    $options = getopt("htrof:w:a:");
    
    // Help
    if(isset($options['h'])){
        echo <<<EOF
Usage: php ownership.php [opts] -a "Article Title"
    -h  Show this help menu
    -t  Switch to process the talk pages or not
    -f  What memory factor to use when determining the sentence ownership (between 0.00 and 1.00.  Default is 0.95)
    -w  The minimum word count for sentences (integer at least 1.  Default is 5)
    -a  What article to process (To do them all do "*". Default is "*")
    -r  Do not do any relationship calculations
    -o  Do not do any ownership calculations

EOF;
        exit;
    }
    // Talk?
    if(isset($options['t'])){
        $talk = "true";
    }
    else{
        $talk = "false";
    }
    // Relations?
    if(isset($options['r'])){
        $doRelations = false;
    }
    else{
        $doRelations = true;
    }
    // Ownership?
    if(isset($options['o'])){
        $doOwnership = false;
    }
    else{
        $doOwnership = true;
    }
    // Memory Factor
    $memoryFactor = 0.95;
    if(isset($options['f'])){
        if(is_numeric($options['f']) &&
           $options['f'] >= 0.00 &&
           $options['f'] <= 1.00){
            $memoryFactor = $options['f'];
        }
        else{
            echo "Memory Factory (-f) must be between 0.00 and 1.00.  Using $memoryFactor as default.\n";
        }
    }
    else{
        echo "Memory Factory (-f) not specified.  Using $memoryFactor as default.\n";
    }
    // Min Word Count
    if(isset($options['w'])){
        if(is_numeric($options['w']) &&
           $options['w'] >= 1){
            $minWC = $options['w'];
        }
    }
    // Article
    if(isset($options['a'])){
        $articleToProcess = $options['a'];
    }
    else{
        $articleToProcess = "*";
    }
    
    while ($art = $articles->fetch_object()) {
        $sentenceHistory = array();
        $article = $art->article;
        $articleId = $art->id;
        if($articleToProcess != "*" && 
           $article != $articleToProcess){
            continue;
        }
        $talkNS = "";
        $talkCol = 0;
        if($talk == "true"){
            $talkNS = "Talk:";
            $talkCol = 1;
        }
        $revisions = array();
        $sql = "SELECT * 
                FROM `{$set_table}` 
                WHERE `article_id` = '{$articleId}' 
                AND talk = '{$talkCol}'";
        $data = $mysqli->query($sql);
        while($rev = $data->fetch_object()){
            $revisions[$rev->Rev_Date] = $rev;
        }
        if(count($revisions) == 0){
            // Don't have article data in the DB, so go and fetch it from wikipedia
            $rev_history = json_decode(file_get_contents("https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=$talkNS".urlencode($article)."&rvlimit=max&rvprop=user|ids|timestamp&format=json&rvdir=newer"));
            $pages = (array)$rev_history->query->pages;
            $done = false;
            $lastrevid = 0; 
            $revisions = array();
            while(!$done){
                foreach($pages as $page){
                    if(isset($page->revisions)){
                        foreach($page->revisions as $rev){
                            $rev->rev_id = $rev->revid;
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
                    $rev_history = json_decode(file_get_contents("https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=$talkNS".urlencode($article)."&rvlimit=max&rvprop=user|ids|timestamp&format=json&rvdir=newer&rvstartid=".($lastrevid+1)));
                    $pages = (array)$rev_history->query->pages;
                }
            }
        }
        ksort($revisions);
        $previousSentences = array();
        $users = array();
        $lastRevSentences = array();
        $relations = array();
        $ownership = array();
        $nSentences = 0;
        echo "Initializing $talkNS{$article}...\n";
        
        $sql = "DELETE FROM `ownership_sentences_jmis`
                WHERE `article_id` = '".$mysqli->escape_string($articleId)."'
                AND `talk` = $talkCol;";
        $sql2 = "DELETE FROM `ownership_results_jmis`
                 WHERE `article_id` = '".$mysqli->escape_string($articleId)."'
                 AND `talk` = $talkCol
                 AND `factor` = $memoryFactor;";
        $sql3 = "DELETE FROM `ownership_relations_jmis`
                 WHERE `article_id` = '".$mysqli->escape_string($articleId)."'
                 AND `talk` = $talkCol";
        
        $mysqli->query($sql);
        if($doOwnership){
            $mysqli->query($sql2);
        }
        if($doRelations){
            $mysqli->query($sql3);
        }
        
        $check = array();
        $checkSQL = "SELECT *
                     FROM `ownership_sentences_jmis`
                     WHERE `article_id` = '{$articleId}'
                     AND `talk` = '{$talkCol}'";
        $checkData = $mysqli->query($checkSQL);
        while ($c = $checkData->fetch_object()){
            $check[$c->Rev_ID][$c->Sentence_ID] = $c;
        }
        $storedSentences = array();
        foreach($revisions as $timestamp => $rev){
            $users[$rev->User_ID] = $rev->User_ID;
            $revid = $rev->Rev_ID;
            $user = $rev->User_ID;
            $cache = "cache/".str_replace(":", "_", $talkNS).str_replace("/", "_", str_replace(" ", "_", $article))."_{$revid}";
            $isVandal = (strstr($rev->Class, "j") !== false || strstr($rev->Class, "i") !== false);
            if(file_exists($cache)){
                $json = json_decode(file_get_contents($cache));
            }
            else{
                if(!is_dir("cache")){
                    mkdir("cache");
                }
                $json = file_get_contents("http://en.wikipedia.org/w/api.php?action=parse&prop=text&page=$talkNS".urlencode($article)."&oldid=$revid&format=json");
                file_put_contents($cache, $json);
                $json = json_decode($json);
            }
            if(!isset($json->parse)){
                // Page must be deleted
                continue;
            }
            echo "== REVID $revid - $timestamp ==\n";
            $text = (array)$json->parse->text;
            $str = $text['*'];
            
            $sentences = getSentences($str);

            // Process the sentences
            $finalSentences = processSentences($revid, $user, $relations, $previousSentences, $lastRevSentences, $sentences, $storedSentences, $isVandal);
            
            if(!isset($check[$revid]) || count($finalSentences) != count($check[$revid])){
                $sql = "INSERT INTO `ownership_sentences_jmis` (`last_id`, `article_id`, `rev_id`, `section`, `sentence_id`, `owner`, `sentence`, `talk`)
                        VALUES ";
                $rows = array();
                $rows2 = array();
                foreach($finalSentences as $key => $sentence){
                    if(!isset($check[$revid][$key])){
                        $last = ($isVandal) ? null : @$sentence['last'];
                        $last = @$sentence['last'];
                        $rows[] =  "('".$mysqli->escape_string($last)."',".
                                   "'".$mysqli->escape_string($articleId)."',".
                                   "'".$mysqli->escape_string($revid)."',".
                                   "'".$mysqli->escape_string($sentence['section'])."',".
                                   "'".$mysqli->escape_string($key)."',".
                                   "'".$mysqli->escape_string($sentence['user'])."',".
                                   "'".$mysqli->escape_string($sentence['raw'])."',".
                                   "$talkCol)";
                    }
                }
                $res = $mysqli->query($sql.implode(",\n", $rows));
            }
            if($doOwnership){
                foreach($ownership as $u => $o){
                    $ownership[$u] = $o*$memoryFactor;
                }
                foreach($users as $u){
                    $sentenceCount = 0;
                    if(isset($ownership[$u])){
                        $sentenceCount = $ownership[$u];
                    }
                    foreach($finalSentences as $sentence){
                        if($sentence['user'] == $u){
                            $sentenceCount++;
                        }
                    }
                    $ownership[$u] = $sentenceCount;
                }
                asort($ownership);
                $ownership = array_reverse($ownership);
                $percentSum = 0;
                $nSentences = $nSentences*$memoryFactor;
                //$nSentences += count($sentences);
                $nSentences += count($finalSentences);
                $sql2 = "INSERT INTO `ownership_results_jmis` (`article_id`,`rev_id`,`user`,`percent`,`factor`,`talk`) VALUES ";
                $rows2 = array();
                foreach($ownership as $u => $sentenceCount){
                    $percent = ($sentenceCount/max(1,$nSentences))*100;
                    $rows2[] = "('".$mysqli->escape_string($articleId)."',".
                                "'".$mysqli->escape_string($revid)."',".
                                "'".$mysqli->escape_string($u)."',".
                                "'".$mysqli->escape_string($percent)."',".
                                "'".$mysqli->escape_string($memoryFactor)."',".
                                "$talkCol)";
                    $percentSum += $percent;
                    if(isset($relations[$u])){
                        $rels = $relations[$u];
                        asort($rels);
                        $rels = array_reverse($rels);
                    }
                }
                $publicDomain = abs(100 - $percentSum);
                $mysqli->query($sql2.implode(",\n", $rows2));
            }
            $sentenceSQL = "SELECT * 
                            FROM `ownership_sentences_jmis`
                            WHERE article_id = '$articleId'
                            AND rev_id = $revid
                            AND talk = $talkCol";
            $sentenceData = $mysqli->query($sentenceSQL);
            while ($sent = $sentenceData->fetch_object()){
                $storedSentences[$sent->Rev_ID."_".$sent->Sentence_ID] = $sent;
            }
        }
        
        if($doRelations){
            $sql3 = "INSERT INTO `ownership_relations_jmis` (`sent_id`,`rel_sent_id`,`article_id`,`modifier`,`type`,`wordsIns`,`wordsDel`,`takesOwnership`,`talk`) VALUES ";
            $rows3 = array();
            foreach($relations as $u => $rels){
                foreach($rels as $u1 => $r){
                    if($u !== false && $u1 !== false){
                        foreach($r as $r1){
                            $history = $r1['history'];
                            $sent = $history;
                            $sentId = 0;
                            if($sent != null){
                                $sentence = $storedSentences[$sent['revId']."_".$sent['sentId']];
                                $sentId = $sentence->ID;
                            }
                            $relHistory = $r1['relHistory'];
                            $relSent = $relHistory;
                            $relSentId = 0;
                            if($relSent != null){
                                $relSentence = $storedSentences[$relSent['revId']."_".$relSent['sentId']];
                                $relSentId = $relSentence->ID;
                            }
                            
                            if($r1['type'] == 'adds_new' && $sentId != $relSentId){
                                echo $sent['revId']."_".$sent['sentId'].", ".$relSent['revId']."_".$relSent['sentId']."\n";
                            }
                            $rows3[] = "('".$mysqli->escape_string($sentId)."',".
                                        "'".$mysqli->escape_string($relSentId)."',".
                                        "'".$mysqli->escape_string($articleId)."',".
                                        "'".$mysqli->escape_string($r1['modifier'])."',".
                                        "'".$mysqli->escape_string($r1['type'])."',".
                                        "'".$mysqli->escape_string($r1['wordsIns'])."',".
                                        "'".$mysqli->escape_string($r1['wordsDel'])."',".
                                        "'".$mysqli->escape_string($r1['takesOwnership'])."',".
                                        "$talk)";
                        }
                    }
                }
            }
            $mysqli->query($sql3.implode(",\n", $rows3));
            if($article == $articleToProcess){
                exit;
            }
        }
    }

?>
