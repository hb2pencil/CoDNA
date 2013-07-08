<?php 
    require_once("lib/config.inc.php");
?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />

		<!-- Always force latest IE rendering engine (even in intranet) & Chrome Frame
		Remove this if you use the .htaccess -->
		<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />

		<title>Interactive Visualization</title>
		<meta name="description" content="Interactive visualization of Wikipedia Article edit history." />
		<meta name="author" content="Henry Brausen" />
		<link rel="stylesheet" href="css/jquery-ui-1.8.21.custom.css">
		<link rel="stylesheet" href="css/interactive2.css">
	</head>

	<body>
		<div id="everything">
			<div id="floater"></div>
			<div id="content" class="ui-corner-all">
				<div id="maincontainer">
					<div id="left">
						<div id="toolbar_wrapper" class="ui-corner-bottom">
							<div id="toolbar" class="ui-corner-all">
								<div id="toolbar_top" class="ui-corner-top"></div>
								<!--
								<button id="t_cursor">Cursor Type</button>
								<button id="t_options">Options</button>
								<hr>-->
								<div id="t_select" class="t_button">Contributors</div>
								<!--div id="t_section" class="t_button">Page Section</div-->
								<div id="t_legend" class="t_button">Article Revision Categories</div>
								<div id="t_talk" class="t_button">Talk Page Revision Categories</div>
								<hr>
								<div id="t_deselect" class="t_button">Reset Selections</div>
								<hr>
								<!--button id="t_info">Selection Information</button-->
								<div id="t_data" class="t_button">Revision Details</div>
							</div>
						</div>
					</div>
					<div id="right">
						<div id="viewtabs">
							<ul>
							    <li><a href="#artview">Article View</a></li>
							    <li><a href="#talkview">Talk Page View</a></li>
							    <li><a href="#hybridview">Hybrid View</a></li>
							    <div id="page_title" style="float: right;">Lagrangian_mechanics</div>
							</ul>
							<div id="artview">
								<div id="view" class="view ui-corner-all">
									<div id="view_loading">Loading . . .</div>
									<div class="spacing_wrapper ui-corner-all">
										<div id="toAdj" class="t_button"></div>
										<div id="toTime" class="t_button"></div>
									</div>
								</div>
							</div>
							<div id="talkview" class="view ui-corner-all"></div>
							<div id="hybridview" class="view ui-corner-all"></div>
							</div>
						</div>
					</div>
				<div id="navctl">
					
				</div>
			</div>
			<div id="diag_cursor">
				<h3>Choose a Cursor Type Below</h3>
				<table>
					<tr><td><input type="radio" name="cursor" id="cursor0" checked/></td><td><label for="cursor0">Panning Cursor</label></td></tr>
					<tr><td><input type="radio" name="cursor" id="cursor1" /></td><td><label for="cursor1">Select Element Cursor</label></td></tr>
					<tr><td><input type="radio" name="cursor" id="cursor2" /></td><td><label for="cursor2">Select User Cursor</label></td></tr>
				</table>
			</div>
			<div id="diag_options">
				
			</div>
			<div id="diag_select">
				<div id="d_select_tabs">
					<ul>
						<li><a href="#users_select">Users</a></li>
						<li><a href="#groups_select">Groups</a></li>
					</ul>
					<div id="users_select">
						<div id="select_checkboxes">
							<h3>Quick Select:</h3>
							<table>
								<tr><td><input type="checkbox" name="userclassselect" value="Anon" /></td><td>Anonymous Users</td></tr>
								<tr><td><input type="checkbox" name="userclassselect" value="User" /></td><td>Registered Users</td></tr>
								<tr><td><input type="checkbox" name="userclassselect" value="Power User" /></td><td>Power Users</td></tr>
								<tr><td><input type="checkbox" name="userclassselect" value="Admin" /></td><td>Administrators</td></tr>
								<tr><td><input type="checkbox" name="userclassselect" value="Bot" /></td><td>Bots</td></tr>
							</table>
						</div>
						<div id="select_users">
							<select size="7" name="userselect" id="userselect" multiple="yes">
								
							</select>
						</div>
						<div class="select_apply_div">
							<a id="select_apply">Apply Selection</a>
						</div>
					</div>
					<div id="groups_select">
						<div id="d_select_groups_accordion">
							<h3><a href="#" class="leganchor"><input type="checkbox" name="groupselect" value="Anon" checked="checked" /><span class="leglabel">Anonymous Users</span></a></h3>
							<div><p>Users who are not logged in. These users are associated with an IP address and usually not have a wikipedia account.</p></div>
							<h3><a href="#" class="leganchor"><input type="checkbox" name="groupselect" value="User" checked="checked" /><span class="leglabel">Registered Users</span></a></h3>
							<div><p>Users who are logged in with a Wikipedia account without significant additional privileges. These users may edit some articles that anonymous users cannot.</p></div>
							<h3><a href="#" class="leganchor"><input type="checkbox" name="groupselect" value="Power User" checked="checked" /><span class="leglabel">Power Users</span></a></h3>
							<div><p>Registered users with a selection of enhanced privileges and access rights. These privileges are given to editors that are trusted by the community.</p></div>
							<h3><a href="#" class="leganchor"><input type="checkbox" name="groupselect" value="Admin" checked="checked" /><span class="leglabel">Administrators</span></a></h3>
							<div><p>Registered users with many advanced and/or restricted privileges, such as the ability to delete articles, sanction users, or change user privileges. These users are highly trusted by the community.</p></div>
							<h3><a href="#" class="leganchor"><input type="checkbox" name="groupselect" value="Bot" checked="checked" /><span class="leglabel">Bots</span></a></h3>
							<div><p>Autonomous or semi-autonomous computer programs that are approved by the community to operate on Wikipedia. Bots exist to remove spam, fix typos or spelling mistakes, and to perform routine maintenance tasks on Wikipedia.</p></div>
						</div>
					</div>
				</div>
			</div>
			<div id="diag_info">
				<h3>Information on Current Selection:</h3>
				<em id="d_info_noselection">Nothing is selected. Make a selection using the cursor or through the "Select Users" dialog.</em>
				<div id="d_info_selection">
					
				</div>
			</div>
			<div id="diag_data">
				
			</div>
			<div id="diag_talk">
				<div id="d_talk_accordion" class="d_checkable">
					<h3>
						<a href="#" class="leganchor">
							<input type="checkbox" name="talkselect" value="crit" checked="checked" />
							<img src="img/icon_crit.png" />
							<span class="leglabel">Criticism</span>
						</a>
					</h3>
					<div>
						<p>Comments that serve to identify flaws or deficiencies in the article. Criticism includes the identification of incomplete or missing details, lack of accuracy or correctness, structural and linguistic deficiencies and objectivity issues.</p>
					</div>
					<h3>
						<a href="#" class="leganchor">
							<input type="checkbox" name="talkselect" value="perf" checked="checked" />
							<img src="img/icon_perf.png" />
							<span class="leglabel">Performative</span>
						</a>
					</h3>
					<div>
						<p>Comments relating to actions taken by the editor himself (announcements or reports of edits he has made) or those intended for other users (suggestions or recommendations for change.)</p>
					</div>
					<h3>
						<a href="#" class="leganchor">
							<input type="checkbox" name="talkselect" value="inf" checked="checked" />
							<img src="img/icon_info.png" />
							<span class="leglabel">Informative</span>
						</a>
					</h3>
					<div>
						<p>Comments that provide, request, or correct information or facts relating to the contents of the article or the discussion page.</p>
					</div>
					<h3>
						<a href="#" class="leganchor">
							<input type="checkbox" name="talkselect" value="att" checked="checked" />
							<img src="img/icon_att.png" />
							<span class="leglabel">Attitude</span>
						</a>
					</h3>
					<div>
						<p>Interpresonal communication that demonstrates a given attitude towards other editors or their comments. This category includes comments that display positive or negative attitudes towards others, and those that demonstrate acceptance or rejection.</p>
					</div>
				</div>
			</div>
			<div id="diag_legend">
				<div id="d_legend_accordion" class="d_checkable">
					<h3>
						<a href="#" class="leganchor">
							<input type="checkbox" name="editcatselect" value="edit" checked="checked" />
							<div class="l_copyedit l_colour"></div><span class="leglabel">Copyediting</span>
						</a>
					</h3>
					<div>
						<p>
							Small changes in the text and citations, including both minor additions and deletions.
						</p>
					</div>
					<h3>
						<a href="#" class="leganchor">
							<input type="checkbox" name="editcatselect" value="addrem" checked="checked" />
							<div class="l_addremove l_colour"></div>
							<span class="leglabel">Content [Addition or Deletion]</span>
						</a>
					</h3>
					<div>
						<p>The textual description of the encyclopedic entry.</p>
						<table style="">
							<tr><td class="legLabelTCell"><div class="l_add l_colour"></div></td><td style="text-align: left;">Content Addition</td><td>Addition of substantive new content to the Article</td></tr>
							<tr><td class="legLabelBCell"><div class="l_rem l_colour"></div></td><td style="text-align: left;">Content Deletion</td><td>Removal of substantive content from the article.</td></tr>
						</table>
					</div>
					<h3>
						<a href="#" class="leganchor">
							<input type="checkbox" name="editcatselect" value="cite" checked="checked" />
							<div class="l_cite l_colour"></div>
							<span class="leglabel">Citation</span>
						</a>
					</h3>
					<div>
						<p>
							Addition of detailed references to external sources that were consulted during the creation of the article.
						</p>
					</div>
					<h3>
						<a href="#" class="leganchor">
							<input type="checkbox" name="editcatselect" value="reorganize" checked="checked" />
							<div class="l_reorganize l_colour"></div>
							<span class="leglabel">Reorganization</span>
						</a>
					</h3>
					<div>
						<p>
							Restructuring of the article’s contents, namely changing the location of sections and paragraphs.
						</p>
					</div>
					<h3>
						<a href="#" class="leganchor">
							<input type="checkbox" name="editcatselect" value="unsure" checked="checked" />
							<div class="l_unsure l_colour"></div>
							<span class="leglabel">Misc.</span>
						</a>
					</h3>
					<div>
						<p>
							Edits that do not clearly fall under any other category.
						</p>
					</div>
					<h3>
						<a href="#" class="leganchor">
							<input type="checkbox" name="editcatselect" value="vandunvand" checked="checked" />
							<div class="l_vandunvand l_colour"></div>
							<span class="leglabel">Vandalism [Addition or Deletion]</span>
						</a>
					</h3>
					<div>
						<p>
							Edits that are irrelevant or inappropriate for a particular article, including the deliberate damaging of others’ edits.
						</p>
						<table style="margin: 0 auto; clear: both; float: center; width: 100%;">
							<tr><td class="legLabelTCell"><div class="l_vand l_colour"></div></td><td style="text-align: left;">Vandalism Addition</td><td>Insertion of inappropriate content.</td></tr>
							<tr><td class="legLabelBCell"><div class="l_unvand l_colour"></div></td><td style="text-align: left;">Vandalism Deletion</td><td>Quality assurance efforts to remove vandalism.</td></tr>
						</table>
					</div>
				</div>
			</div>
		</div>
		<script type="text/javascript" src="js/vendor/jquery-1.7.2.min.js"></script>
		<script type="text/javascript" src="js/vendor/jquery-ui-1.8.20.custom.min.js"></script>
		<script type="text/javascript" src="js/buttonsetv.js"></script>
		<script type="text/javascript" src="js/vendor/d3.v2.min.js"></script>
		<script type="text/javascript" src="js/sorttable.js"></script>
		<script type="text/javascript" src="js/vendor/jquery_svg/jquery.svg.js"></script>
		<script type="text/javascript" src="js/vendor/jquery_svg/jquery.svgdom.js"></script>
		<?php if($environment == "prod"){ ?>
	        <script type="text/javascript" src="js/build/codna.min.js"></script>
		<?php } else if($environment == "dev"){ ?>
	        <script type="text/javascript" src="js/src/state.js"></script>
	        <script type="text/javascript" src="js/src/helpers.js"></script>
	        <script type="text/javascript" src="js/src/ui.js"></script>
	        <script type="text/javascript" src="js/src/visualization.js"></script>
	        <script type="text/javascript" src="js/src/main.js"></script>
		<?php } ?>
	</body>
</html>
