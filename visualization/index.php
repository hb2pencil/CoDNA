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

		<title>Collaboration DNA</title>
		<meta name="description" content="Interactive visualization of Wikipedia Article edit history." />
		<meta name="author" content="Henry Brausen, David Turner, Adam Balila" />
		<link rel="stylesheet" href="css/jquery-ui-1.8.21.custom.css">
		<link rel="stylesheet" href="css/interactive2.css">
	</head>

	<body>
		<div id="everything">
		    <div id="topTabs"></div>
			<div id="content" class="ui-corner-all">
				<!-- This is where all the content goes -->
			</div>
		</div>
		<?php include("js/templates.html"); ?>
		<script type="text/javascript" src="js/vendor/jquery-1.7.2.min.js"></script>
		<script type="text/javascript" src="js/vendor/jquery-ui-1.8.20.custom.min.js"></script>

        
		<script type="text/javascript" src="js/vendor/d3.v3.min.js"></script>
		<script type="text/javascript" src="js/sorttable.js"></script>
		<script type="text/javascript" src="js/vendor/jquery_svg/jquery.svg.js"></script>
		<script type="text/javascript" src="js/vendor/jquery_svg/jquery.svgdom.js"></script>
		<script type="text/javascript" src="js/vendor/underscore/underscore.min.js"></script>
		<?php if($environment == "prod"){ ?>
		    <script type="text/javascript" src="js/vendor/backbone/backbone.min.js"></script>
		<?php } else if($environment == "dev"){ ?>
		    <script type="text/javascript" src="js/vendor/backbone/backbone.js"></script>
		<?php } ?>
		<script type="text/javascript" src="js/vendor/backbone/backbone.subviews.js"></script>
		<?php if($environment == "prod"){ ?>
	        <script type="text/javascript" src="js/build/codna.min.js"></script>
		<?php } else if($environment == "dev"){ ?>
	        <!-- Models -->
	        <script type="text/javascript" src="js/src/Models/NonUniqueCollection.js"></script>
	        <script type="text/javascript" src="js/src/Models/User.js"></script>
	        <script type="text/javascript" src="js/src/Models/UserSet.js"></script>
	        <script type="text/javascript" src="js/src/Models/TopTab.js"></script>
	        <script type="text/javascript" src="js/src/Models/Article.js"></script>
	        <script type="text/javascript" src="js/src/Models/ArticleSet.js"></script>
	        <script type="text/javascript" src="js/src/Models/Classification.js"></script>
	        <script type="text/javascript" src="js/src/Models/WikiViz.js"></script>
	        <script type="text/javascript" src="js/src/Models/Sentences.js"></script>
	        
	        <!-- Views -->
	        <script type="text/javascript" src="js/src/Views/DialogView.js"></script>
	        <script type="text/javascript" src="js/src/Views/TopTabView.js"></script>
	        <script type="text/javascript" src="js/src/Views/NewArticleView.js"></script>
	        <script type="text/javascript" src="js/src/Views/WikiVizView.js"></script>
	        <script type="text/javascript" src="js/src/Views/ArticleView.js"></script>
	        <script type="text/javascript" src="js/src/Views/UserView.js"></script>
	        <script type="text/javascript" src="js/src/Views/ArticleInfoView.js"></script>
	        <script type="text/javascript" src="js/src/Views/UserInfoView.js"></script>
	        <script type="text/javascript" src="js/src/Views/ToolbarView.js"></script>
	        <script type="text/javascript" src="js/src/Views/NavCtlView.js"></script>
	        <script type="text/javascript" src="js/src/Views/SentencesView.js"></script>
	        
	        <!-- Other -->
	        <script type="text/javascript" src="js/src/helpers.js"></script>
	        <script type="text/javascript" src="js/src/router.js"></script>
		<?php } ?>
	</body>
</html>
