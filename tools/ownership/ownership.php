<?php

    require_once("diff.php");
    require_once("algorithm.php");
    require_once("../../visualization/lib/config.inc.php");
    require_once("../../visualization/lib/DBConnection.inc.php");
    
    $mysqli = DBConnection::get()->handle();

    $article = "Lagrangian_mechanics";
    
    $rev_history = json_decode(file_get_contents("https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles=$article&rvlimit=max&rvprop=user|ids|timestamp&format=json&rvdir=newer"));
    $pages = (array)$rev_history->query->pages;
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
    $relations = array();
    $ownership = array();
    $nSentences = 0;
    echo "Initializing...\n";
    $sql = "SELECT `id` 
            FROM `classification_articles`
            WHERE `page_title` = '".$mysqli->escape_string($article)."'";
    $result = $mysqli->query($sql);
    $articleId = $result->fetch_object()->id;
    $sql = "DELETE FROM `ownership_sentences`
            WHERE `article` = '".$mysqli->escape_string($articleId)."';";
    $sql2 = "DELETE FROM `ownership_results`
             WHERE `article` = '".$mysqli->escape_string($articleId)."';";
    $sql3 = "DELETE FROM `ownership_relations`
             WHERE `article` = '".$mysqli->escape_string($articleId)."';";
    $mysqli->query($sql);
    $mysqli->query($sql2);
    $mysqli->query($sql3);
    foreach($revisions as $timestamp => $rev){
        $users[$rev->user] = $rev->user;
        $revid = $rev->revid;
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

        // Process the sentences
        $finalSentences = processSentences($revid, $user, $relations, $previousSentences, $lastRevSentences, $sentences);

        $sql = "INSERT INTO `ownership_sentences` (`article`, `rev_id`, `section`, `sentence_id`, `owner`, `sentence`)
                VALUES ";
        $rows = array();
        $rows2 = array();
        foreach($finalSentences as $key => $sentence){
             $rows[] =  "('".$mysqli->escape_string($articleId)."',".
                         "'".$mysqli->escape_string($revid)."',".
                         "'".$mysqli->escape_string($sentence['section'])."',".
                         "'".$mysqli->escape_string($key)."',".
                         "'".$mysqli->escape_string($sentence['user'])."',".
                         "'".$mysqli->escape_string($sentence['raw'])."')";
        }
        $mysqli->query($sql.implode(",\n", $rows));
        echo "== REVID $revid - $timestamp ==\n";
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
        $nSentences += count($sentences);
        $sql2 = "INSERT INTO `ownership_results` (`article`,`rev_id`,`user`,`percent`) VALUES ";
        $rows2 = array();
        foreach($ownership as $u => $sentenceCount){
            $percent = ($sentenceCount/max(1,$nSentences))*100;
            $rows2[] = "('".$mysqli->escape_string($articleId)."',".
                        "'".$mysqli->escape_string($revid)."',".
                        "'".$mysqli->escape_string($u)."',".
                        "'".$mysqli->escape_string($percent)."')";
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
    
    $sql3 = "INSERT INTO `ownership_relations` (`article`,`rev_id`,`modifier`,`owner`,`type`,`attr`) VALUES ";
    $rows3 = array();
    foreach($relations as $u => $rels){
        foreach($rels as $u1 => $r){
            if($u !== false && $u1 !== false){
                foreach($r as $r1){
                    $rows3[] = "('".$mysqli->escape_string($articleId)."',".
                                "'".$mysqli->escape_string($r1['attr']['revId'])."',".
                                "'".$mysqli->escape_string($r1['modifier'])."',".
                                "'".$mysqli->escape_string($r1['owner'])."',".
                                "'".$mysqli->escape_string($r1['type'])."',".
                                "'".$mysqli->escape_string(json_encode($r1['attr']))."')";
                }
            }
        }
    }
    $mysqli->query($sql3.implode(",\n", $rows3));

?>
