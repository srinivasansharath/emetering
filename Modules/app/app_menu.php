<?php

    global $session, $user;
    
    
    $apikey = "";
    if ($session['write']) $apikey = "?apikey=".$user->get_apikey_write($session['userid']);
    
    $menu_left[] = array(
        'name'=>"E-Meters", 
        'path'=>"app/" , 
        'session'=>"write", 
        'order' => 5,
        'icon'=>'icon-leaf icon-white',
        'dropdown'=>array(
            
            array('name' => 'E-Meter: 1', 'icon' => '', 'path' => "app$apikey#myelectric", 'session' => 'read', 'order' => 1),
            array('name' => 'E-Meter: 2', 'icon' => '', 'path' => "app$apikey#myelectric2", 'session' => 'read', 'order' => 2),
            array('name' => 'E-Meter: 3', 'icon' => '', 'path' => "app$apikey#myelectric3", 'session' => 'read', 'order' => 3),
            array('name' => 'E-Meter: 4', 'icon' => '','path' => "app$apikey#myelectric4", 'session' => 'read', 'order' => 4),
            array('name' => 'E-Meter: 5', 'icon' => '','path' => "app$apikey#myelectric5", 'session' => 'read', 'order' => 5)            
        )
    );
    
    

