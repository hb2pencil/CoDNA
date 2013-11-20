<?php
    /*
     * dbquery.php: A script to retrieve wiki classification and user classification data as JSON.
     * 
     * In addition to retrieving the wiki classification data, ths script
     * also transforms the more refined classification in the database into the
     * more general classification scheme.
     */
    session_write_close();
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
    require_once('lib/WikiRevision.inc.php');
    
    header('Content-type: application/json');
    
    if (isset($_REQUEST['article'])) {    // Client is requesting user/revision data.
        $article = $_REQUEST['article'];
        $lower = 0;
        if (isset($_REQUEST['lower'])) {
            $lower = intval($_REQUEST['lower']);
        }
        $upper = 10;
        if (isset($_REQUEST['upper'])) {
            $upper = intval($_REQUEST['upper']);
        }
        
        WikiRevision::useTable('articles_data');
        
        $wikirevs = WikiRevision::getBy(array('page_title' => $article), $lower, $upper);
        $revdata = array();
        
        if (!empty($wikirevs)){
            foreach ($wikirevs as $revobj) {
                $array = $revobj->toArray();
                $revdata[] = array_map('utf8_encode', $array);
            }
        }
        // Build array of all users associated with our selection of revisions
        // and remove duplicates
        $users = array();
        for ($i = 0; $i < count($revdata); ++$i) {
            $users[] = $revdata[$i]['user'];
        }
        $users = array_unique($users);
        
        // Now, we need to grab the user classification data
        $mysqli = DBConnection::get()->handle();
        
        $userdata = array();
        
        foreach ($users as $u) {
            $stmt = $mysqli->prepare("SELECT u.userid, u.user, g.timestamp, g.userclass, u.flagged
                                      FROM users as u inner join users_grouphistory as g on u.g_histid=g.g_histid 
                                      WHERE u.user=?");
            $stmt->bind_param("s", $u);
            $stmt->execute();
            $stmt->bind_result($userid, $user, $timestamp, $userclass, $flagged);
            $history = array();
            while ($stmt->fetch()) {
                array_push($history, array('timestamp' => $timestamp, 'userclass' => $userclass));
            }
            $userdata[$user] = array('userid' => $userid, 'history' => $history, 'flagged' => $flagged);
            $stmt->close();
        }
        
        // Fetch talkpage data
        $talk = array();
        $stmt = $mysqli->prepare("SELECT id, topic, contributor, timestamp, content, lev, indent, crit, perf, inf, att 
                                  FROM talkpages_simple 
                                  WHERE article=? 
                                  ORDER BY timestamp");
        $stmt->bind_param("s", $article);
        $stmt->execute();
        $stmt->bind_result($id, $topic, $contributor, $timestamp, $content, $lev, $indent, $crit, $perf, $inf, $att);
        while ($stmt->fetch()) {
            array_push($talk, array('id' => $id, 'topic' => $topic, 'contributor' => $contributor, 'timestamp' => $timestamp,
                        'content' => $content, 'lev' => $lev, 'indent' => $indent, 'crit' => $crit, 'perf' => $perf,
                        'inf' => $inf, 'att' => $att));
        }
        
        // Fetch quality stats
        $quality = array();
        $stmt->close();
        $stmt = $mysqli->prepare("SELECT q.cutoff, q.metric, q.score, q.description
                                  FROM articles_quality q, articles a
                                  WHERE q.article_id = a.id
                                  AND a.page_title =?");
        $stmt->bind_param("s", $article);
        $stmt->execute();
        $stmt->bind_result($cutoff, $metric, $score, $description);
        while($stmt->fetch()){
            $json = json_decode($description);
            $desc = array();
            $desc['Accuracy'] = $json->LibDelphAccur;
            $desc['Completeness'] = $json->LibDelphCompl;
            $desc['Representation'] = $json->LibDelphPres;
            $desc['Objectivity'] = $json->LibDelphObject;
            $desc['Overal Quality'] = $json->LibDelphQuality;
            $quality[] = array('cutoff' => $cutoff,
                               'metric' => $metric,
                               'score' => $score,
                               'description' => $desc);
        }
        $stmt->close();
        $events = array();
        $stmt = $mysqli->prepare("SELECT e.timestamp, e.title, e.description
                                  FROM articles_events e, articles a
                                  WHERE e.article_id = a.id
                                  AND a.page_title =?");
        $stmt->bind_param("s", $article);
        $stmt->execute();
        $stmt->bind_result($timestamp, $title, $description);
        while($stmt->fetch()){
            $events[] = array('timestamp' => $timestamp,
                              'title' => $title,
                              'description' => $description);
        }
        $stmt->close();
        $google = array();
        $stmt = $mysqli->prepare("SELECT g.timestamp, g.value
                                  FROM articles_google g, articles a
                                  WHERE g.article_id = a.id
                                  AND a.page_title =?");
        $stmt->bind_param("s", $article);
        $stmt->execute();
        $stmt->bind_result($timestamp, $value);
        while($stmt->fetch()){
            $google[] = array('timestamp' => $timestamp,
                              'value' => $value);
        }
        $stmt->close();
        
        $response = array('revisions' => $revdata, 
                          'users' => $userdata, 
                          'quality' => $quality,
                          'events' => $events,
                          'google' => $google,
                          'talk' => $talk);
        echo json_encode($response);
    } else if(isset($_REQUEST['user'])){ // Client is requesting article/revision data
        $user = $_REQUEST['user'];
        $revdata = array();
        $articles = array();
        $talk = array();
        
        // Now, we need to grab the user classification data
        $mysqli = DBConnection::get()->handle();
        
        $sql = "SELECT `rev_id`, `par_id`, `timestamp`, `user`, `userid`, `comment`, `page_title`, `diff`, `lev`, `class`, `rand`
                FROM `articles_data`
                WHERE `user`=?
                ORDER BY `timestamp`";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param("s", $user);
        $stmt->execute();
        $stmt->bind_result($revid, $parid, $timestamp, $name, $userid, $comment, $title, $diff, $lev, $class, $rand);
        while ($stmt->fetch()) {
            $revdata[] = array('rev_id' => $revid,
                               'par_id' => $parid, 
                               'timestamp' => $timestamp, 
                               'user' => $name, 
                               'userid' => $userid, 
                               'comment' => $comment, 
                               'page_title' => $title, 
                               'diff' => $diff, 
                               'lev' => $lev, 
                               'class' => $class, 
                               'rand' => $rand);
            if(!isset($articles[$title])){
                $articles[$title] = true;
            }
        }
        $stmt->close();
        $events = array();
        $stmt = $mysqli->prepare("SELECT a.timestamp, a.title, a.type
                                  FROM users_awards a
                                  WHERE a.user =?");
        $stmt->bind_param("s", $user);
        $stmt->execute();
        $stmt->bind_result($timestamp, $title, $type);
        while($stmt->fetch()){
            $events[] = array('timestamp' => $timestamp,
                              'title' => $title,
                              'description' => "Type: $type");
        }
        $stmt->close();
        $response = array('revisions' => $revdata, 
                          'articles' => array_keys($articles), 
                          'talk' => $talk,
                          'events' => $events);
        echo json_encode($response);
    } else if(isset($_REQUEST['users'])) {   // Client is requesting users list
        // Grab DB Handle
        $mysqli = DBConnection::get()->handle();
        
        $stmt = $mysqli->prepare("SELECT userid, user, u.g_histid, flagged, (SELECT COUNT(*) FROM `articles_data` cl WHERE cl.user=u.user) as edits, h.timestamp as created, u.set
                                  FROM `users` u, `users_grouphistory` h
                                  WHERE h.g_histid = u.g_histid
                                  AND h.timestamp != '1970-01-01T00:00:00Z'
                                  ORDER BY edits DESC, created ASC");
        $stmt->execute();
        $stmt->bind_result($userid, $user, $g_histid, $flagged, $edits, $created, $set);
        $userslist = array();
        $done = array();
        while ($stmt->fetch()) {
            if($edits > 0 && !isset($done[$user])){
                $userslist[] = array('id' => $userid, 
                                     'name' => $user,
                                     'histid' => $g_histid,
                                     'flagged' => $flagged,
                                     'edits' => $edits,
                                     'created' => $created,
                                     'set' => $set
                                    );
                $done[$user] = true;
            }
        }
        $stmt->close();
        echo json_encode($userslist);
    } else if(isset($_REQUEST['list'])) { // Client is requesting article list
        // Grab DB Handle
        $mysqli = DBConnection::get()->handle();
        $stmt = $mysqli->prepare("SELECT DISTINCT a.page_title, (SELECT COUNT(*) FROM articles_data ad WHERE ad.page_title=a.page_title) AS rev_count, a.set
                                  FROM articles a
                                  WHERE a.set != 3
                                  ORDER BY rev_count DESC");
        $stmt->execute();
        $stmt->bind_result($title, $revcount, $set);
        $titlelist = array();
        while ($stmt->fetch()) {
            array_push($titlelist, array('title' => $title, 
                                         'rev_count' => $revcount, 
                                         'set' => $set));
        }
        $stmt->close();
        echo json_encode($titlelist);
    } else if (isset($_REQUEST['listArticleSets'])) {
        // Grab DB Handle
        $mysqli = DBConnection::get()->handle();
        
        $stmt = $mysqli->prepare("SELECT `id`, `name`, `url`, (SELECT COUNT(*) FROM `articles` WHERE `set` = s.`id`) as count
                                  FROM `articles_sets` s
                                  WHERE `name` != 'Others'");
        $stmt->execute();
        $stmt->bind_result($id, $name, $url, $count);
        $list = array();
        while ($stmt->fetch()) {
            $titlelist[] = array('id' => $id, 
                                 'name' => $name,
                                 'url' => $url,
                                 'count' => $count);
        }
        $stmt->close();
        echo json_encode($titlelist);
    }
    else if (isset($_REQUEST['listUserSets'])) {
        // Grab DB Handle
        $mysqli = DBConnection::get()->handle();
        
        $stmt = $mysqli->prepare("SELECT `id`, `name`, `url`, (SELECT COUNT(*) FROM `users` WHERE `set` = s.`id`) as count
                                  FROM `users_sets` s");
        $stmt->execute();
        $stmt->bind_result($id, $name, $url, $count);
        $list = array();
        while ($stmt->fetch()) {
            $titlelist[] = array('id' => $id, 
                                 'name' => $name,
                                 'url' => $url,
                                 'count' => $count);
        }
        $stmt->close();
        echo json_encode($titlelist);
    }
    else {
        die('Error: Invalid request!');
    }
?>
