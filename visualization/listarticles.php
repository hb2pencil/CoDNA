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
	require_once('lib/DBConnection.inc.php');
	
	header('Content-type: application/json');

	// Grab the user classification data
	$mysqli = DBConnection::get()->handle();
	
	$stmt = $mysqli->prepare("SELECT DISTINCT cl.page_title, (SELECT count(*) FROM classification_data cl2 WHERE cl2.page_title=cl.page_title) AS rev_count FROM classification_data cl ORDER BY rev_count DESC");
	$stmt->execute();
	$stmt->bind_result($title, $revcount);
	$titlelist = array();
	while ($stmt->fetch()) {
		array_push($titlelist, array('title' => $title, 'rev_count' => $revcount));
	}
	$stmt->close();
	
	echo json_encode($titlelist);
?>