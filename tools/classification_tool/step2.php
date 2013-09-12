<html>
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
		<link rel="stylesheet" href="style.css" />
		<title>Classify Edit</title>
	</head>
	<body>
		<?php
			error_reporting(E_ALL);
			ini_set('display_errors', '1');
			require_once("../../visualization/lib/config.inc.php");
            require_once("../../visualization/lib/DBConnection.inc.php");
			$par = $_REQUEST['par_id'];
			$to = $_REQUEST['rev_id'];
			$title = $_REQUEST['page_title'];
			
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL, "http://$wikiroot//w/api.php?action=compare&format=json&fromrev=$par&torev=$to");
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
			curl_setopt($ch, CURLOPT_USERAGENT, 'Manual Classification Tool 1.0');
			
			$diff = json_decode(curl_exec($ch), true);
			
			curl_close($ch);
			
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL, "http://$wikiroot//w/api.php?action=query&prop=revisions&format=json&rvprop=ids%7Ctimestamp%7Cuser%7Cuserid%7Ccomment&rvlimit=1&rvdir=newer&rvdiffto=prev&titles=$title&rvstartid=$to");
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
			curl_setopt($ch, CURLOPT_USERAGENT, 'Manual Classification Tool 1.0');
			
			$meta_raw = json_decode(curl_exec($ch), true);
			
			curl_close($ch);
			
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL, "http://$wikiroot//w/api.php?action=query&prop=revisions&format=json&rvprop=ids%7Ccontent&rvlimit=2&rvdir=newer&rvstartid=$par&titles=$title");
			//print "http://en.wikipedia.org//w/api.php?action=query&prop=revisions&format=json&rvprop=ids%7Ccontent&rvlimit=2&rvdir=newer&rvstartid=$par&titles=$title";
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
			curl_setopt($ch, CURLOPT_USERAGENT, 'Levenshtein Distance Tool 1.0');
			
			$apiresp = json_decode(curl_exec($ch), true);
			
			curl_close($ch);
			
			$apiresp = reset($apiresp["query"]["pages"]);
			$to_lev = $apiresp["revisions"];
			
			exec("rm -f ./last.txt");
			exec("touch ./last.txt");
			
			$lev = 0;
			
			foreach ($to_lev as $meta) {
				$content = $meta["*"];
				$revid = $meta["revid"];
				$fh = fopen("cur.txt", 'w');
				fwrite($fh, $content);
				fclose($fh);
				$lev = exec("./lev ./cur.txt ./last.txt");
				exec("mv -f ./cur.txt ./last.txt");
			}
			
			$rand = rand();
			
			$metadata = reset($meta_raw["query"]["pages"]);
			$metadata = $metadata["revisions"][0];
			$timestamp = $metadata["timestamp"];
			$user = $metadata["user"];
			$userid = $metadata["userid"];
			$comment = $metadata["comment"];
		?>
		<form action="step3.php" method="post">
		<table class="main">
			<tr>
				<td class="label">Title</td>
				<td class="data"><input type="hidden" name="page_title" value="<?php echo $title ?>"/><?php echo $title ?></td>
			</tr>
			<tr>
				<td class="label">Revision ID</td>
				<td class="data"><?php echo $_REQUEST['rev_id']?><input type="hidden" name="rev_id" value="<?php echo $_REQUEST['rev_id']?>" /></td>
			</tr>
			<tr>
				<td class="label">Parent ID</td>
				<td class="data"><?php echo $_REQUEST['par_id']?><input type="hidden" name="par_id" value="<?php echo $_REQUEST['par_id']?>" /></td>
			</tr>
			<tr>
				<td class="label">Timestamp</td>
				<td class="data"><input type="hidden" name="timestamp" value="<?php echo $timestamp ?>"/><?php echo $timestamp ?></td>
			</tr>
			<tr>
				<td class="label">User</td>
				<td class="data"><input type="hidden" name="user" value="<?php echo $user ?>"/><?php echo $user ?></td>
			</tr>
			<tr>
				<td class="label">User ID</td>
				<td class="data"><input type="hidden" name="userid" value="<?php echo $userid ?>"/><?php echo $userid ?></td>
			</tr>
			<tr>
				<td class="label">Comment</td>
				<td class="data"><input type="hidden" name="comment" value="<?php echo $comment ?>"/><?php echo $comment ?></td>
			</tr>
			<tr class="diff">
				<td class="label">Diff</td>
				<td class="data"><table class="diff"><?php echo $diff["compare"]["*"]; ?></table></td>
			</tr>
			<tr>
				<td class="label">Levenshtein Distance</td>
				<td class="data"><input type="hidden" name="lev" value="<?php echo $lev ?>"/><?php echo $lev ?></td>
			</tr>
			<tr>
				<td class="label">Classification</td>
				<td class="data">
					<table><tr><td>
					<input type="checkbox" name="cite" value="a" />Add Citations<br />
					<input type="checkbox" name="add" value="b" />Add Substantive New Content<br />
					<input type="checkbox" name="wiki" value="c" />Add Wiki Markup<br />
					<input type="checkbox" name="create" value="d" />Create a New Article<br />
					<input type="checkbox" name="delete" value="e" />Delete Substantive Content<br />
					<input type="checkbox" name="typo" value="f" />Fix Typo(s)/Grammatical Errors<br />
					</td><td>
					<input type="checkbox" name="reorganize" value="g" />Reorganize Existing Text<br />
					<input type="checkbox" name="rephrase" value="h" />Rephrase Existing Text (not Typo/Grammar)<br />
					<input type="checkbox" name="vandalize" value="i" />Add Vandalism<br />
					<input type="checkbox" name="devandalize" value="j" />Delete Vandalism<br />
					</td></tr></table>
				</td>
			</tr>
			<tr>
				<td class="label">Rand</td>
				<td class="data"><?php echo $rand; ?><input type="hidden" name="rand" value="<?php echo $rand; ?>" /></td>
			</tr>
			<tr>
				<td class="submit"><input type="submit" value="Submit" /></td>
			</tr>
		</table>
		</form>
	</body>
</html>
