"use strict";

var canvas = null;
var ctx = null;

$(document).ready(function() {
	// Time between successive gestures
	var GESTURE_COOLDOWN = 1000;
	
	// Direction vector threshold
	var GESTURE_THRESHOLD = 0.8;
	
	// Get player model from Spotify
    var sp = getSpotifyApi();
    var models = sp.require('$api/models');
    var player = models.player;
    
    // Time of last gesture - used for gesture cooldown
	var lastGesture = new Date().getTime();
	
	// Name of last gesture - shown on canvas then gradually fades out
	var lastGestureName = "";
	
	canvas = document.getElementById("leapify");
	
	// Request updates from the Leap controller
	Leap.loop({enableGestures: true}, function(obj) {
		// Process any gestures detected in this frame
		if (obj.gestures.length > 0) {
			obj.gestures.forEach(function(gesture) {
				processGesture(gesture);
			});
		}
		
		// Render hands
		draw(obj);
		
		// Update now playing text
		updateNowPlaying(player.track);
	});
	
	// Render the user's hands and show position relative to the Leap
	function draw(obj) {
		if (canvas == null || ctx == null)
			return;
		
		// Clear canvas
		ctx.clearRect(-canvas.width/2,-canvas.height,canvas.width,canvas.height);
		
		// Render a rectangle showing the leap
		var now = new Date().getTime();
		
		// Green if gesturing possible; gray otherwise.
		if (now - lastGesture < GESTURE_COOLDOWN) {
			ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
		} else {
			ctx.fillStyle = "rgba(154, 200, 71, 1)";
		}
		
		ctx.fillRect(-70, -35, 140, 30);
		
		// Show the name of the last gesture
		if (now - lastGesture < GESTURE_COOLDOWN) {
			ctx.font = '70pt Lato';
			ctx.textAlign = 'center';
			ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.7 - ((now - lastGesture) / GESTURE_COOLDOWN) * 0.7) + ')';
			ctx.fillText(lastGestureName, 0, -150);
		}
		
		// Draw "table"
		ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
		ctx.fillRect(-canvas.width/2, -5, canvas.width, 5);
		
		// Draw a circle for each finger
		ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
		var pointablesMap = obj.pointablesMap;
		for (var i in pointablesMap) {
			var pointable = pointablesMap[i];
			var pos = pointable.tipPosition;

			// Map circle size to position relative to sensor
			var radius = Math.min(600/Math.abs(pos[2]),20);
			ctx.beginPath();
			ctx.arc(pos[0]-radius/2,-pos[1]-radius/2,radius,0,2*Math.PI);
			ctx.fill();
		}
		
		// Draw a circle for each hand
		ctx.fillStyle = "rgba(154, 200, 71, 0.7)";
		var handMap = obj.handsMap;
		for (var i in handMap) {
			var pos = handMap[i].palmPosition;
			
			var radius = 40;
			ctx.beginPath();
			ctx.arc(pos[0]-radius/2,-pos[1]-radius/2,radius,0,2*Math.PI);
			ctx.fill();
		}
	};
	
	// Update the text showing which song is playing
	function updateNowPlaying(track) {
		$("#nowPlaying").text(track);
	}
	
	// Process a gesture update
	function processGesture(json) {
		var now = new Date().getTime();
		
		if (now - lastGesture < GESTURE_COOLDOWN)
			return;
		
		if (json['state'] == "stop" && json['type'] == "swipe") {
			var absX = Math.abs(json['direction'][0]);
			var absY = Math.abs(json['direction'][1]);
			var absZ = Math.abs(json['direction'][2]);
			
			var max = -1;
			
			// Check which direction the swipe is in
			if (absX > absY && absX > absZ)
				max = 0;
			else if (absY > absX && absY > absZ)
				max = 1;
			else if (absZ > absX && absZ > absY)
				max = 2;
			
			// If direction isn't obvious, don't classify gesture
			if (max == -1)
				return;
			
			var direction = json['direction'][max] < 0 ? -1 : 1;
			var value = Math.abs(json['direction'][max]);
			
			// If there's not a significant motion, don't classify gesture
			if (value < GESTURE_THRESHOLD)
				return;
			
			var gestured = false;
			
			// Left and right swipes
			if (max == 0) {
				if (direction == -1) {
					player.previous();
					lastGestureName = "Previous";
				} else if (direction == 1) {
					player.next();
					lastGestureName = "Next";
				}
				
				gestured = true;
			// Up and down swipes
			} else if (max == 1) {
				if (direction == -1) {
					player.playing = !(player.playing);
					gestured = true;
					
					if (player.playing)
						lastGestureName = "Play";
					else
						lastGestureName = "Pause";
				}
			// Backwards and forwards movement
			} else {
				return;
			}
			
			if (gestured)
				lastGesture = now;
		}
	};
});

$(window).resize(function() {
	// Resize canvas to window size
	canvas.width = $(window).width();
	canvas.height = $(window).height();

	// Update rendering context
	ctx = canvas.getContext("2d");
	ctx.translate(canvas.width/2,canvas.height);
});