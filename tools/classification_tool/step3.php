<html>
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<title>Classify Summary</title>
		<link rel="stylesheet" href="style.css" />
	</head>
	<body>
	<h2>Errors / Warnings</h2>
	<div class="data"><p>
	<?php
		error_reporting(E_ALL);
		ini_set('display_errors', '1');
		require_once('WikiRevision.inc.php');
		require_once('config.inc.php');
		
		$par = $_REQUEST['par_id'];
		$to = $_REQUEST['rev_id'];
		
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, "http://$wikiroot//w/api.php?action=compare&format=json&fromrev=$par&torev=$to");
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_USERAGENT, 'Revision Classification Tool 1.0');
		
		$diff = json_decode(curl_exec($ch), true);
		
		curl_close($ch);
		
		//print_r($_REQUEST);
		
		$t_data = array();
		$t_data['rev_id'] = $to;
		$t_data['par_id'] = $par;
		$t_data['timestamp'] = $_REQUEST['timestamp'];
		$t_data['user'] = $_REQUEST['user'];
		$t_data['userid'] = $_REQUEST['userid'];
		$t_data['comment'] = $_REQUEST['comment'];
		$t_data['page_title'] = $_REQUEST['page_title'];
		$t_data['diff'] = $diff["compare"]["*"];
		$t_data['lev'] = $_REQUEST["lev"];
		$t_data['class'] = '';
		$t_data['rand'] = $_REQUEST['rand'];
		
		if (isset($_REQUEST['cite'])) $t_data['class'] .= $_REQUEST['cite'].';';
		if (isset($_REQUEST['add'])) $t_data['class'] .= $_REQUEST['add'].';';
		if (isset($_REQUEST['wiki'])) $t_data['class'] .= $_REQUEST['wiki'].';';
		if (isset($_REQUEST['create'])) $t_data['class'] .= $_REQUEST['create'].';';
		if (isset($_REQUEST['delete'])) $t_data['class'] .= $_REQUEST['delete'].';';
		if (isset($_REQUEST['typo'])) $t_data['class'] .= $_REQUEST['typo'].';';
		if (isset($_REQUEST['reorganize'])) $t_data['class'] .= $_REQUEST['reorganize'].';';
		if (isset($_REQUEST['rephrase'])) $t_data['class'] .= $_REQUEST['rephrase'].';';
		if (isset($_REQUEST['vandalize'])) $t_data['class'] .= $_REQUEST['vandalize'].';';
		if (isset($_REQUEST['devandalize'])) $t_data['class'] .= $_REQUEST['devandalize'].';';
		
		$t_data['class'] = substr($t_data['class'], 0, -1);
		WikiRevision::useTable('classification_data');
		$rev = new WikiRevision($t_data);
		$rev->insert();
	?>
	</p></div>
	<h2>Summary</h2>
	<table class="main">
		<tr>
			<td class="label">page_title</td>
			<td class="data"><?php echo $t_data['page_title'] ?></td>
		</tr>
		<tr>
			<td class="label">rev_id</td>
			<td class="data"><?php echo $t_data['rev_id'] ?></td>
		</tr>
		<tr>
			<td class="label">par_id</td>
			<td class="data"><?php echo $t_data['par_id'] ?></td>
		</tr>
		<tr>
			<td class="label">timestamp</td>
			<td class="data"><?php echo $t_data['timestamp'] ?></td>
		</tr>
		<tr>
			<td class="label">user</td>
			<td class="data"><?php echo $t_data['user'] ?></td>
		</tr>
		<tr>
			<td class="label">userid</td>
			<td class="data"><?php echo $t_data['userid'] ?></td>
		</tr>
		<tr>
			<td class="label">comment</td>
			<td class="data"><?php echo $t_data['comment'] ?></td>
		</tr>
		<tr>
			<td class="label">diff</td>
			<td class="data"><table class="diff"><?php echo $t_data['diff'] ?></table></td>
		</tr>
		<tr>
			<td class="label">class</td>
			<td class="data"><?php echo $t_data['class'] ?></td>
		</tr>
		<tr>
			<td class="label">rand</td>
			<td class="data"><?php echo $t_data['rand'] ?></td>
		</tr>
	</table>
	</body>
</html>