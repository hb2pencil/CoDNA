<?php

    require_once("../../visualization/lib/config.inc.php");
    require_once("../../visualization/lib/DBConnection.inc.php");
    
    
    function migrate($table){
        $mysqli = DBConnection::get()->handle();
        $sql = "SELECT `rev_id`, `class` FROM `$table`";
        $result = $mysqli->query($sql);
        while ($obj = $result->fetch_object()) {
            $revid = $obj->rev_id;
            $classes = explode(";", $obj->class);
            foreach($classes as $class){
                if($class != "x" && $class != ""){
                    $sql = "INSERT INTO `classification_classes` (`rev_id`,`class`)
                            VALUES ('$revid','$class')";
                    $mysqli->query($sql);
                }
            }
        }
    }
    
    migrate("classification_data");
    migrate("classification_data_multiuser");
    migrate("classification_data_simple");

?>
