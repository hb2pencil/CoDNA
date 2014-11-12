<?php
require_once('DBConnection.inc.php');

// The class WikiRevision stores one revision entry and manages storage and retrieval from the DB.
class WikiRevision {
	
	// Names of fields that comprise an instance.
	protected static $fields = array(
		'rev_id',
		'par_id',
		'article_id',
		'rev_date',
		'user_id',
		'comment',
		'lev',
		'class'
	);
	
	private $data = array();
	
	private static $table = '';
	
	public static function useTable($table)
	{
		WikiRevision::$table = $table;
	}
	
	// Define default values for an entry
	private static function getEmpty()
	{
		$t_data = array();
		$t_data['rev_id'] = 0;
		$t_data['par_id'] = 0;
		$t_data['article_id'] = 0;
		$t_data['rev_date'] = '';
		$t_data['userid'] = 0;
		$t_data['comment'] = '';
		$t_data['page_title'] = '';
		$t_data['lev'] = 0;
		$t_data['class'] = '';
		$t_data['rand'] = rand();
		return new WikiRevision($t_data);
	}
	
	public function __construct($indata)
	{
		$this->data = $indata;
	}
	
	// Build an entry from a non-associative array.
	public static function fromArray($ar)
	{
		$entry = WikiRevision::getEmpty();
		for ($i = 0; $i < min(count($ar), count(WikiRevision::$fields)); $i++) {
			$entry->data[WikiRevision::$fields[$i]] = $ar[$i];
		}
		return $entry;
	}
	
	// Unpack DB response into instances of WikiRevision()
	public static function unpackRows($response)
	{
		// Return a null result if we don't have any rows.
		if (!$response || $response->num_rows < 1) return NULL;
		
		$ret = array();
		
		// Append the unpacked rows to the result.
		while ($row = $response->fetch_assoc()) {
			$entry = WikiRevision::getEmpty();	// Get defaults
			foreach (WikiRevision::$fields as $key) {	// Store any retrieved fields.
				if (array_key_exists($key, $row)) $entry->data[$key] = $row[$key];
			}
			$ret[] = $entry;	// Append this row to the return array.
		}
		return $ret;
	}
	
	// Update this record in the database.
	public function update()
	{
		$mytable = WikiRevision::$table;
		$buf = "UPDATE $mytable SET ";
		for ($i = 0; $i < count(WikiRevision::$fields); $i++) {
			$buf .= WikiRevision::$fields[$i] . " = '" . DBConnection::get()->handle()->real_escape_string($this->data[$fields[$i]]) . "'" . ($i == count(WikiRevision::$fields) - 1)?(', '):(' ');
		}
		$buf .= "WHERE rev_id = " . $data['rev_id'];
		DBConnection::get()->handle()->query($buf);
	}
	
	public function insert()
	{
		$mytable = WikiRevision::$table;
		$buf = "INSERT INTO $mytable VALUES (";
		for ($i = 0; $i < count(WikiRevision::$fields); $i++) {
			$buf .= "'" . DBConnection::get()->handle()->real_escape_string($this->data[WikiRevision::$fields[$i]]) . "'" . (($i < count(WikiRevision::$fields) - 1)?(', '):(' '));
		}
		$buf .= ')';
		if (!DBConnection::get()->handle()->query($buf)) {
			echo $buf . "<br />" . "\n";
			echo "Error: " . DBConnection::get()->handle()->error;
		}
	}
	
	public function &getData()
	{
		return $this->data;
	}
	
	public static function getBy($conditions, $lower = 0, $upper = 10, $diffs = FALSE) {
		$mytable = WikiRevision::$table;
		$query = "SELECT ";
		if ($diffs) {
			$query .= "*";
		} else {
			function flt($elem) { return $elem != 'diff'; }
			$query .= implode(",", array_filter(WikiRevision::$fields, 'flt'));
		}
		$query .= " FROM `$mytable` ";
		if (count($conditions) > 0) $query .= "WHERE";
		foreach ($conditions as $key => $val) {
			if (!in_array($key, WikiRevision::$fields)) {
				return NULL;
			}
			$myval = DBConnection::get()->handle()->real_escape_string($val);
			$query .= " $key='$myval' AND";
		}
		// Note that we order wikirevisions by timestamp!
		$query = substr($query, 0, -3)."ORDER BY rev_date LIMIT $lower, $upper";
		$res = DBConnection::get()->handle()->query($query);
		return WikiRevision::unpackRows($res);
	}
	
	public function toArray($simple = TRUE) {
		$ret = $this->data;
		if (!$simple) return $ret;
		$classes = explode(';', $ret['class']);
		$clist = array();
		if (in_array('f', $classes) || in_array('h', $classes))
			array_push($clist, 'a');
		if (in_array('b', $classes))
			array_push($clist, 'b');
		if (in_array('e', $classes))
			array_push($clist, 'c');
		if (in_array('c', $classes) || in_array('g', $classes))
			array_push($clist, 'd');
		if (in_array('a', $classes))
			array_push($clist, 'e');
		if (in_array('i', $classes))
			array_push($clist, 'f');
		if (in_array('j', $classes))
			array_push($clist, 'g');
		if (in_array('x', $classes))
			array_push($clist, 'x');
		$ret['class'] = implode(';', $clist);
		return $ret;
	}
}

?>
