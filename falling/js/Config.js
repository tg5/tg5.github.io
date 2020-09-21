var Config = {};

Config.colors = ["#000000", "#00a651", "#00adee", "#ed2a7a", "#ec1c23"];
		
Config.framerate = 30;//in frames (at 30 fps), duration of 1 crash

Config.duration = 35 * Config.framerate/30;//in frames (at 30 fps), duration of 1 crash
Config.intervalMin = 2 * Config.framerate/30;//in frames (at 30 fps), time between 2 crashes
Config.intervalMax = 20 * Config.framerate/30;//in frames (at 30 fps), time between 2 crashes

//settings for drawing polygons/paths:
Config.chanceExtraSidePoint = .9;
Config.extraPointsMin = 0;
Config.extraPointsMax = 3;
Config.ease = -100;//<0: easeIn, >0: easeOut, 100: flash easeOut

//settings for rotation:
	
Config.rotationSpeedMax = 2;//in degrees
Config.rotationSpeedEase = -200;//<0 easeIn, >0 easeOut
	
//
Config.width = 1;
Config.height = 1;

