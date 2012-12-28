<?php
	/*
	 * dbquery.php: A script to retrieve wiki classification and user classification data as JSON.
	 * 
	 * In addition to retrieving the wiki classification data, ths script
	 * also transforms the more refined classification in the database into the
	 * more general classification scheme.
	 */
	error_reporting(E_ALL);
	ini_set('display_errors', '1');
	require_once('lib/WikiRevision.inc.php');
	
	header('Content-type: application/json');
	
	if (!isset($_REQUEST['article'])) die('Error: Specify an article!');
	
	$article = $_REQUEST['article'];
	$lower = 0;
	if (isset($_REQUEST['lower'])) {
		$lower = intval($_REQUEST['lower']);
	}
	$upper = 10;
	if (isset($_REQUEST['upper'])) {
		$upper = intval($_REQUEST['upper']);
	}
	
	WikiRevision::useTable('classification_data');
	
	$wikirevs = WikiRevision::getBy(array('page_title' => $article), $lower, $upper);
	$revdata = array();
	
	if (!empty($wikirevs))
		foreach ($wikirevs as $revobj) {
			array_push($revdata, $revobj->toArray());
		}
	
	// Build array of all users associated with our selection of revisions
	// and remove duplicates
	$users = array();
	for ($i = 0; $i < count($revdata); ++$i) {
		array_push($users, $revdata[$i]['user']);
	}
	$users = array_unique($users);
	
	// Now, we need to grab the user classification data
	$mysqli = DBConnection::get()->handle();
	
	$userdata = array();
	
	foreach ($users as $u) {
		// TODO: When transfering to new data source (JSIST set) use table 'users' rather than 'h_users'!!!
		$stmt = $mysqli->prepare("SELECT u.userid, u.user, g.timestamp, g.userclass, u.flagged" .
			" from h_users as u inner join h_users_grouphistory as g on u.g_histid=g.g_histid where u.user=?");
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
	$stmt = $mysqli->prepare("SELECT id, topic, contributor, timestamp, content, lev, indent, crit, perf, inf, att FROM talkpages_simple WHERE article=?");
	$stmt->bind_param("s", $article);
	$stmt->execute();
	$stmt->bind_result($id, $topic, $contributor, $timestamp, $content, $lev, $indent, $crit, $perf, $inf, $att);
	while ($stmt->fetch()) {
		array_push($talk, array('id' => $id, 'topic' => $topic, 'contributor' => $contributor, 'timestamp' => $timestamp,
					'content' => $content, 'lev' => $lev, 'indent' => $indent, 'crit' => $crit, 'perf' => $perf,
					'inf' => $inf, 'att' => $att));
	}
	
	$response = array('revisions' => $revdata, 'users' => $userdata, 'talk' => $talk);
	
	echo json_encode($response);
?>