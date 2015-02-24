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
    ini_set('memory_limit','512M');
    require_once('lib/WikiRevision.inc.php');
    
    header('Content-type: application/json');
    
    $mysqli = DBConnection::get()->handle();
    
    $stmt = $mysqli->prepare("SELECT `Set_ID`, `Set_Table`
                              FROM `articles_sets`
                              WHERE `Set_Table` != ''");
    $stmt->execute();
    $stmt->bind_result($id, $table);
    $set_mappings = array('articles' => array(),
                          'users' => array());
    while ($stmt->fetch()) {
        if($table != ""){
            $set_mappings['articles'][$id] = $table;
        }
    }
    $stmt->close();
    $stmt = $mysqli->prepare("SELECT `Set_ID`, `Set_Table`
                              FROM `users_sets`");
    $stmt->execute();
    $stmt->bind_result($id, $table);
    while ($stmt->fetch()) {
        $set_mappings['users'][$id] = $table;
    }
    $stmt->close();
    
    ob_start("ob_gzhandler");
    if (isset($_REQUEST['article'])) {    // Client is requesting user/revision data.
        $article = $mysqli->real_escape_string($_REQUEST['article']);
        $set = $_REQUEST['set'];
        $table = $mysqli->real_escape_string($set_mappings['articles'][$set]);
        $set = $mysqli->real_escape_string($set);
        
        $wikirevs = array();      
        $stmt = $mysqli->prepare("SELECT DISTINCT t.rev_id, t.par_id, t.rev_date, t.user_id, t.comment, t.lev, t.class, a.page_title
                                  FROM `{$table}` t, `articles` a, `articles_to_sets` s
                                  WHERE a.article_id = {$article}
                                  AND a.article_id = t.article_id
                                  AND s.set_id = {$set}
                                  AND a.article_id = s.article_id
                                  AND s.cutoff_date > t.rev_date
                                  ORDER BY t.rev_date");
        $stmt->execute();
        $stmt->bind_result($rev_id, $par_id, $rev_date, $user_id, $comment, $lev, $class, $page_title);
        while ($stmt->fetch()) {
            $wikirevs[] = array('rev_id' => $rev_id,
                                'par_id' => $par_id,
                                'timestamp' => str_replace(" ", "T", $rev_date."Z"),
                                'userid' => utf8_encode($user_id),
                                'user' => utf8_encode($user_id),
                                'comment' => utf8_encode($comment),
                                'lev' => max(0, $lev),
                                'class' => str_replace(",", ";", $class),
                                'page_title' => utf8_encode($page_title));
        }
        
        $revdata = array();
        
        $sections = array();
        $stmt = $mysqli->prepare("SELECT DISTINCT a.`rev_id`, s.section
                                  FROM  `{$table}` a, `ownership_relations_jmis` r, `ownership_sentences_jmis` s
                                  WHERE a.`article_id`=?
                                  AND a.`rev_id` = s.`rev_id`
                                  AND s.id = r.sent_id");
        $stmt->bind_param("s", $article);
        $stmt->execute();
        $stmt->bind_result($revid, $section);
        while ($stmt->fetch()) {
            $section = str_replace("[edit]", "", $section);
            if($section == $article){
                $revs = array_values($wikirevs);
                $section = $revs[0]['page_title'];
            }
            $section = utf8_encode($section);
            $sections[$revid][$section] = $section;
        }
        
        if (!empty($wikirevs)){
            foreach ($wikirevs as $revobj) {
                $array = array_map('utf8_encode', $revobj);
                $array['sections'] = (isset($sections[$array['rev_id']])) ? array_values($sections[$array['rev_id']]) : array();
                $revdata[] = $array;
            }
        }
        
        // Build array of all users associated with our selection of revisions
        // and remove duplicates
        $users = array();
        for ($i = 0; $i < count($revdata); ++$i) {
            $users[] = $revdata[$i]['user'];
        }
        $users = array_unique($users);
        
        $userdata = array();
        
        foreach ($users as $u) {
            $stmt = $mysqli->prepare("SELECT u.user_id, u.user_id, r.level_date, r.high_level, 0 as flagged
                                      FROM users u, users_role_changes r
                                      WHERE u.user_id =?
                                      AND u.user_id = r.user_id");
            $stmt->bind_param("s", $u);
            $stmt->execute();
            $stmt->bind_result($userid, $user, $timestamp, $userclass, $flagged);
            $history = array();
            while ($stmt->fetch()) {
                $group = "Unregistered User";
                switch(trim($userclass)){
                    case "Unregistered Users":
                        $group = "Unregistered User";
                        break;
                    case "Registered Users":
                        $group = "Registered User";
                        break;
                    case "Executives":
                        $group = "Executive";
                        break;
                    case "Super Users":
                        $group = "Super User";
                        break;
                    case "Bot":
                        $group = "Bot";
                        break;
                }
                
                $history[] = array('timestamp' => $timestamp, 'userclass' => $group);
            }
            $userdata[utf8_encode($user)] = array('userid' => utf8_encode($userid), 'history' => $history, 'flagged' => $flagged);
            $stmt->close();
        }
        
        // Fetch talkpage data
        $talk = array();
        $stmt = $mysqli->prepare("SELECT t.rev_id, t.user_id, t.rev_date, t.lev, c.indent, c.crit, c.perf, c.inf, c.att
                                  FROM `articles` a, `{$table}` t, `articles_to_sets` s, `talkpage_classification` c
                                  WHERE a.article_id=?
                                  AND t.article_id = a.talkpage_id
                                  AND s.set_id = {$set}
                                  AND a.article_id = s.article_id
                                  AND s.cutoff_date > t.rev_date
                                  AND c.rev_id = t.rev_id
                                  ORDER BY t.rev_date");
        $stmt->bind_param("s", $article);
        $stmt->execute();
        $stmt->bind_result($id, $contributor, $timestamp, $lev, $indent, $crit, $perf, $inf, $att);
        while ($stmt->fetch()) {
            array_push($talk, array('id' => $id, 
                                    'contributor' => utf8_encode($contributor), 
                                    'timestamp' => str_replace(" ", "T", $timestamp."Z"),
                                    'lev' => $lev,
                                    'indent' => $indent,
                                    'crit' => $crit,
                                    'perf' => $perf,
                                    'inf' => $inf,
                                    'att' => $att));
        }
        
        // Fetch quality stats
        $quality = array();
        $stmt->close();
        $stmt = $mysqli->prepare("SELECT s.cutoff_date, s.quality, s.accuracy, s.completeness, s.objectivity, s.representation 
                                  FROM articles_to_sets s
                                  WHERE s.article_id =?
                                  AND s.set_id = {$set}");
        $stmt->bind_param("s", $article);
        $stmt->execute();
        $stmt->bind_result($cutoff, $qual, $accuracy, $completeness, $objectivity, $representation);
        while($stmt->fetch()){
            if(is_numeric($qual) &&
               is_numeric($accuracy) &&
               is_numeric($completeness) &&
               is_numeric($objectivity) &&
               is_numeric($representation)){
                $desc = array();
                $desc['Accuracy'] = $accuracy;
                $desc['Completeness'] = $completeness;
                $desc['Representation'] = $representation;
                $desc['Objectivity'] = $objectivity;
                $desc['Overal Quality'] = $qual;
                $quality[] = array('cutoff' => str_replace(" ", "T", $cutoff."Z"),
                                   'score' => $qual,
                                   'description' => $desc);
            }
        }
        $stmt->close();
        $events = array();
        /*$stmt = $mysqli->prepare("SELECT e.timestamp, e.title, e.description
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
        $stmt->close();*/
        $google = array();
        
        $stmt = $mysqli->prepare("SELECT t.end_date, t.value
                                  FROM articles_trends t, articles_to_sets s
                                  WHERE t.article_id = {$article}
                                  AND s.set_id = {$set}
                                  AND s.article_id = t.article_id
                                  AND s.cutoff_date > t.end_date
                                  ORDER BY end_date ASC");
        $stmt->execute();
        $stmt->bind_result($timestamp, $value);
        while($stmt->fetch()){
            $google[] = array('timestamp' => str_replace(" ", "T", $timestamp."Z"),
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
    } else if(isset($_REQUEST['sentences'])){ // Client is requesting article sentence data
        $colors = array("#33A02C",
                        "#E31A1C",
                        "#1F78B4",
                        "#FF7F00",
                        "#6A3D9A",
                        "#B15928",
                        "#B2DF8A",
                        "#FDBF6F",
                        "#CAB2D6",
                        "#FB9A99",
                        "#A6CEE3");
        $article = $mysqli->real_escape_string($_REQUEST['sentences']);
        $set = $mysqli->real_escape_string($_REQUEST['set']);
        $table = $set_mappings['articles'][$set];
        $revdata = array();      
        $stmt = $mysqli->prepare("SELECT s.id, s.rev_id, s.section, s.owner, s.sentence, s.last_id as last
                                  FROM `ownership_sentences_jmis` s, `{$table}` t, `articles_to_sets` ss
                                  WHERE s.talk = 0
                                  AND t.talk = 0
                                  AND s.article_id={$article}
                                  AND t.article_id = s.article_id
                                  AND t.rev_id = s.rev_id
                                  AND ss.set_id = {$set}
                                  AND t.article_id = ss.article_id
                                  AND ss.cutoff_date > t.rev_date
                                  ORDER BY id ASC");
        $stmt->execute();
        $stmt->bind_result($id, $rev_id, $section, $owner, $sentence, $last);
        $sentences = array(); // Sentence Hash for compression
        $users = array();
        $userColors = array();
        $revs = array();
        $sections = array();
        while ($stmt->fetch()) {
            $revs[$rev_id] = true;
            
            $sentence = utf8_encode(strip_tags($sentence));
            if($sentence == ""){
                continue;
            }
            if($owner == ""){
                $owner = "Public Domain";
            }
            else{
                @$users[utf8_encode($owner)]++;
            }
            if(count($revs) - 1 >= $_GET['start'] && 
              (count($revdata) <= $_GET['limit'] || isset($revdata[$rev_id]))){
                if(isset($sentences[$sentence])){
                    $sId = $sentences[$sentence];
                }
                else {
                    $sId = count($sentences);
                    $sentences[$sentence] = $sId;
                }
                $section = str_replace("[edit]", "", utf8_encode($section));
                if(!isset($sections[$section])){
                    $maxPerc = 0.00;
                    $maxSection = $section;
                    foreach($sections as $sect){
                        similar_text(strtolower($sect), strtolower($section), $perc);
                        $maxPerc = max($maxPerc, $perc);
                        if($maxPerc == $perc && $perc >= 95){
                            $maxSection = $sect;
                        }
                    }
                    if($maxPerc < 95){
                        $sections[$section] = $section;
                    }
                    $section = $maxSection;
                }
                $revdata[$rev_id][$section][] = array('i' => $id,
                                                      'o' => utf8_encode($owner),
                                                      's' => $sId,
                                                      'l' => $last);
            }
        }
        asort($users);
        $users = array_keys(array_reverse($users));
        foreach($users as $key => $user){
            if(isset($colors[$key])){
                $userColors[$user] = $colors[$key];
            }
            else{
                $userColors[$user] = "#C41AA2";
            }
        }
        $userColors["Public Domain"] = "#C41AA2";
        $response = array('nRevisions' => count($revs),
                          'revisions' => $revdata,
                          'users' => $userColors,
                          'sentences' => array_flip($sentences));
        echo json_encode($response);
    } else if(isset($_REQUEST['user'])){ // Client is requesting article/revision data
        $user = $mysqli->real_escape_string($_REQUEST['user']);
        $set = $_REQUEST['set'];
        $table = $mysqli->real_escape_string($set_mappings['users'][$set]);
        $set = $mysqli->real_escape_string($set);
        $revdata = array();
        $articles = array();
        $talk = array();
        
        $sql = "SELECT `rev_id`, `par_id`, `rev_date`, `user_id`, `comment`, `page_title`, `lev`, `class`
                FROM `{$table}`, users_sets s
                WHERE `user_id`=?
                AND s.set_id = {$set}
                ORDER BY `rev_date`";
        $stmt = $mysqli->prepare($sql);
        $stmt->bind_param("s", $user);
        $stmt->execute();
        $stmt->bind_result($revid, $parid, $timestamp, $userid, $comment, $title, $lev, $class);
        while ($stmt->fetch()) {
            $revdata[] = array('rev_id' => $revid,
                               'par_id' => $parid, 
                               'timestamp' => str_replace(" ", "T", $timestamp."Z"), 
                               'user' => utf8_encode($userid), 
                               'userid' => utf8_encode($userid), 
                               'comment' => utf8_encode($comment), 
                               'page_title' => utf8_encode($title),
                               'lev' => $lev, 
                               'class' => str_replace(",", ";", $class));
            if(!isset($articles[utf8_encode($title)])){
                $articles[utf8_encode($title)] = true;
            }
        }
        $stmt->close();
        $events = array();
        $stmt = $mysqli->prepare("SELECT a.date_received, a.barnstar_name, a.barnstar_name
                                  FROM users_awards_changes a, users_sets s
                                  WHERE a.user_id =?
                                  AND s.set_id = {$set}
                                  AND a.date_received BETWEEN s.start_date AND s.end_date");
        $stmt->bind_param("s", $user);
        $stmt->execute();
        $stmt->bind_result($timestamp, $title, $type);
        while($stmt->fetch()){
            $events[] = array('timestamp' => str_replace(" ", "T", $timestamp."Z"),
                              'title' => utf8_encode($title),
                              'description' => utf8_encode("Type: $type"));
        }
        $stmt->close();
        $response = array('revisions' => $revdata, 
                          'articles' => array_keys($articles), 
                          'talk' => $talk,
                          'events' => $events);
        echo json_encode($response);
    } else if(isset($_REQUEST['users'])) { // Client is requesting users list
        $userslist = array();
        $roleslist = array();
        $stmt = $mysqli->prepare("SELECT user_id, GROUP_CONCAT(DISTINCT med_level SEPARATOR ',') as roles
                                  FROM users_role_changes
                                  WHERE user_id NOT LIKE '%.%.%.%'
                                  GROUP BY user_id");
        $stmt->execute();
        $stmt->bind_result($userid, $roles);
        while ($stmt->fetch()) {
            if(strstr($roles, "Bot") !== false){
                $roleslist[$userid] = "Bot";
            }
        }
        $stmt->close();
        $i = 0;
        foreach($set_mappings['users'] as $id => $table){
            if($table != ""){
                $stmt = $mysqli->prepare("SELECT User_ID, count
                                          FROM (SELECT User_ID, count(Rev_ID) as count FROM {$table} group by User_ID) q1
                                          WHERE User_ID IN (SELECT User_ID FROM users WHERE Wiki_ID IS NOT NULL)
                                          GROUP BY User_ID
                                          ORDER BY count desc");
            }
            else{
                $stmt = $mysqli->prepare("SELECT s.user_id, -1 as edits
                                          FROM users_to_sets s
                                          WHERE s.set_id = {$id}
                                          AND s.user_id IN (SELECT user_id from users WHERE wiki_id IS NOT NULL)");
            }
            $stmt->execute();
            $stmt->bind_result($userid, $edits);
            while ($stmt->fetch()) {
                if($edits != 0){
                    $userslist[] = array('id' => utf8_encode($userid),
                                         'edits' => $edits,
                                         'roles' => utf8_encode(@$roleslist[$userid]),
                                         'set' => $id,
                                         'created' => '2000-01-01T00:00:00Z'
                                        );
                }
            }
            $stmt->close();
        }
        
        /*$stmt = $mysqli->prepare("SELECT userid, user, u.g_histid, flagged, (SELECT COUNT(*) FROM `articles_data` cl WHERE cl.user=u.user) as edits, h.timestamp as created, u.set
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
        $stmt->close();*/
        echo json_encode($userslist);
    } else if(isset($_REQUEST['list'])) { // Client is requesting article list
        $titlelist = array();
        foreach($set_mappings['articles'] as $set => $table){
            $stmt = $mysqli->prepare("SELECT a.page_title, COUNT(*) as rev_count, t.article_id
                                      FROM articles a, articles_to_sets s, `{$table}` as t
                                      WHERE a.article_id = t.article_id
                                      AND s.set_id = {$set}
                                      AND a.article_id = s.article_id
                                      AND s.cutoff_date > t.rev_date
                                      GROUP BY t.article_id
                                      ORDER BY rev_count DESC");
            $stmt->execute();
            $stmt->bind_result($title, $revcount, $article_id);
            
            while($stmt->fetch()){
                $titlelist[] = array('title' => utf8_encode($title), 
                                     'rev_count' => $revcount, 
                                     'set' => $set,
                                     'article_id' => $article_id);
            }
            $stmt->close();
        }
        echo json_encode($titlelist);
    } 
    else if (isset($_REQUEST['listArticleSets'])) {
        $titlelist = array();
        $stmt = $mysqli->prepare("SELECT s.set_id, s.set_name, s.set_url, COUNT(*) as count, s.set_table
                                  FROM `articles_sets` s, `articles_to_sets` a
                                  WHERE s.set_id = a.set_id
                                  GROUP BY s.set_id
                                  ORDER BY count DESC");
        $stmt->execute();
        $stmt->bind_result($id, $name, $url, $count, $table);
        $list = array();
        while ($stmt->fetch()) {
             $url = ($url == null) ? "" : $url;
            $titlelist[] = array('id' => $id, 
                                 'name' => $name,
                                 'url' => $url,
                                 'count' => $count,
                                 'disabled' => false);
        }
        $stmt->close();
        echo json_encode($titlelist);
    }
    else if (isset($_REQUEST['listUserSets'])) {
        $titlelist = array();
        $stmt = $mysqli->prepare("SELECT s.set_id, s.set_name, s.set_url, COUNT(*) as count, s.set_table
                                  FROM `users_sets` s, `users_to_sets` u
                                  WHERE s.set_id = u.set_id
                                  AND u.user_id NOT LIKE '%.%.%.%'
                                  GROUP BY s.set_id
                                  ORDER BY count DESC");
        $stmt->execute();
        $stmt->bind_result($id, $name, $url, $count, $table);
        $list = array();
        while ($stmt->fetch()) {
            $url = ($url == null) ? "" : $url;
            $titlelist[] = array('id' => $id, 
                                 'name' => $name,
                                 'url' => $url,
                                 'count' => $count,
                                 'disabled' => false);
        }
        $stmt->close();
        echo json_encode($titlelist);
    }
    else if (isset($_REQUEST['classifications'])) {
        $stmt = $mysqli->prepare("SELECT type_id, manual_analysis, codna, `factor analysis`, weight, style
                                  FROM `article_edit_type_classes`");
        $stmt->execute();
        $stmt->bind_result($id, $manual, $codna, $factor, $weight, $style);
        $classifications = array();
        while ($stmt->fetch()) {
            $classifications[] = array('id' => $id, 
                                       'manual' => $manual,
                                       'codna' => $codna,
                                       'factor' => $factor,
                                       'weight' => $weight,
                                       'style' => $style);
        }
        $stmt->close();
        echo json_encode($classifications);
    }
    else {
        die('Error: Invalid request!');
    }
?>
