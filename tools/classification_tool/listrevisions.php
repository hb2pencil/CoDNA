<html>
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<link rel="stylesheet" href="style.css" />
		<title>Edit Listing</title>
	</head>
	<?php
		require_once('config.inc.php');
		$title = $_REQUEST['page_title'];
		$limit = $_REQUEST['limit'];
		$startid = $_REQUEST['startid'];
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, "http://$wikiroot//w/api.php?action=query&prop=revisions&format=json&rvprop=ids%7Cuser%7Ctimestamp&rvlimit=$limit&rvdir=newer&titles=$title&rvstartid=$startid");
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_USERAGENT, 'Manual Classification Tool 1.0');
		
		$list_raw = json_decode(curl_exec($ch), true);
		
		$list = reset($list_raw["query"]["pages"]);
		$list = $list["revisions"];
		
		curl_close($ch);
	?>
	<body>
		<table class="main">
		<tr><td class="label">Title</td><td class="data"><?php echo $title ?></td></tr>
		<tr><th>user</th><th>timestamp</th><th>Classify URL</th></tr>
		<?php
			foreach ($list as $el) {
				$rev = $el["revid"];
				$par = $el["parentid"];
				$user = $el["user"];
				$timestamp = $el["timestamp"];
				echo "<tr><td class=\"label\">$user</td><td class=\"label\">$timestamp</td><td class=\"data\"><a href=\"step2.php?page_title=$title&rev_id=$rev&par_id=$par\">step2.php?page_title=$title&rev_id=$rev&par_id=$par</a></td></tr>";
			}
		?>
		</table>
	</body>
</html>