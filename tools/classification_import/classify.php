<?php
require_once("../../visualization/lib/config.inc.php");
require_once("../../visualization/lib/DBConnection.inc.php");

$mysqli = DBConnection::get()->handle();

$file = file_get_contents("classifications.csv");
$lines = explode("\n", $file);
foreach($lines as $line){
    $data = str_getcsv($line);
    if(count($data) > 1){
        $revId = $data[0];
        $a = $data[1];
        $b = $data[2];
        $c = $data[3];
        $d = $data[4];
        $e = $data[5];
        $f = $data[6];
        $g = $data[7];
        $h = $data[8];
        $i = $data[9];
        $j = $data[10];
        $k = $data[11];
        $l = $data[12];
        $m = $data[13];
        
        $class = array();
        if($a) $class[] = 'a';
        if($b) $class[] = 'b';
        if($c) $class[] = 'c';
        if($d) $class[] = 'd';
        if($e) $class[] = 'e';
        if($f) $class[] = 'f';
        if($g) $class[] = 'g';
        if($h) $class[] = 'h';
        if($i) $class[] = 'i';
        if($j) $class[] = 'j';
        if($k) $class[] = 'k';
        if($l) $class[] = 'l';
        if($m) $class[] = 'm';
        
        $class = implode(';', $class);
        
        $sql = "UPDATE `articles_data`
                SET `class` = '$class'
                WHERE `rev_id` = '$revId'";
        $mysqli->query($sql);

    }
}

echo "\n";
?>
