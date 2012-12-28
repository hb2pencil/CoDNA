<?php
//Database Connection singleton
class DBConnection
{
	public static function get()
	{
		static $db = null;
		if($db == null) {
			$db = new DBConnection();
		}
		return $db;
	}
	
	private $_handle = null;
	
	private function __construct() {
		require("config.inc.php");
		$this->_handle = new mysqli($db_host, $db_user, $db_pass, $db_database);
	}
	
	public function handle() {
		return $this->_handle;
	}
	
	public function __destruct()  {
		$this->_handle->close();
	}
}
?>