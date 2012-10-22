
goog.require('SB.Prefabs');

SB.Prefabs.ModelController = function(param)
{
	param = param || {};
	
	var controller = new SB.Entity(param);
	var transform = new SB.Transform;
	controller.addComponent(transform);
	controller.transform.position.set(0, 0, 5);
	var controllerScript = new SB.ModelControllerScript;
	controller.addComponent(controllerScript);

	var dragger = new SB.Dragger();
	var rotator = new SB.Rotator();
	var timer = new SB.Timer( { duration : 3333 } );
	
	controller.addComponent(dragger);
	controller.addComponent(rotator);
	controller.addComponent(timer);

	dragger.subscribe("move", controllerScript, controllerScript.onDraggerMove);
	rotator.subscribe("rotate", controllerScript, controllerScript.onRotatorRotate);
	timer.subscribe("time", controllerScript, controllerScript.onTimeChanged);
	timer.subscribe("fraction", controllerScript, controllerScript.onTimeFractionChanged);	
	
	var viewpoint = new SB.Entity;
	var transform = new SB.Transform;
	var camera = new SB.Camera({active:param.active, fov: param.fov});
	viewpoint.addComponent(transform);
	viewpoint.addComponent(camera);
	viewpoint.transform = transform;
	viewpoint.camera = camera;

	controller.addChild(viewpoint);

	var intensity = param.headlight ? 1 : 0;
	var color = param.headlight ? 0xFFFFFF : 0;
	
	var headlight = new SB.DirectionalLight({ color : color, intensity : intensity });
	controller.addComponent(headlight);
	
	return controller;
}

goog.provide('SB.ModelControllerScript');
goog.require('SB.Component');

SB.ModelControllerScript = function(param)
{
	SB.Component.call(this, param);

	this.directionMatrix = new THREE.Matrix4;
	this.moveDir = new THREE.Vector3;
	this.turnDir = new THREE.Vector3;
	this.lookDir = new THREE.Vector3;
	this.cameraPos = null;
	
	this.lastdx = 0;
	this.dragging = false;
	this.walkSpeed = 1;
	this.turnSpeed = 1;
}

goog.inherits(SB.ModelControllerScript, SB.Component);

SB.ModelControllerScript.prototype.realize = function()
{
	this.dragger = this._entity.getComponent(SB.Dragger);
	this.rotator = this._entity.getComponent(SB.Rotator);
	this.timer = this._entity.getComponent(SB.Timer);
	this.viewpoint = this._entity.getChild(0);
	
	SB.Game.instance.mouseDelegate = this;
	SB.Game.instance.keyboardDelegate = this;
}

SB.ModelControllerScript.prototype.update = function()
{
	if (this.cameraPos)
	{
		this._entity.transform.position.copy(this.cameraPos);
		this.cameraPos = null;
	}
}

SB.ModelControllerScript.prototype.setCameraPos = function(pos)
{
	if (this.cameraPos)
	{
		this.cameraPos.copy(pos);
	}
	else
	{
		this.cameraPos = pos.clone();
	}
}

SB.ModelControllerScript.prototype.move = function(dir)
{
	this.directionMatrix.identity();
	this.directionMatrix.setRotationFromEuler(this._entity.transform.rotation);
	dir = this.directionMatrix.multiplyVector3(dir);
	this._entity.transform.position.addSelf(dir);
}

SB.ModelControllerScript.prototype.turn = function(dir)
{
	SB.Game.instance.sceneRoot.transform.rotation.addSelf(dir);
}

SB.ModelControllerScript.prototype.setCameraTilt = function(dir)
{
	if (this.viewpoint && this.viewpoint.transform)
	{
		this.viewpoint.transform.rotation.copy(dir);
	}
}

SB.ModelControllerScript.prototype.setCameraTurn = function(dir)
{
	if (this._entity && this._entity.transform)
	{
		this._entity.transform.rotation.copy(dir);
	}
}

SB.ModelControllerScript.prototype.onMouseMove = function(x, y)
{
	this.dragger.set(x, y);
	this.rotator.set(x, y);
}

SB.ModelControllerScript.prototype.onMouseDown = function(x, y)
{
	this.dragger.start(x, y);
	this.rotator.start(x, y);
	this.dragging = true;
}

SB.ModelControllerScript.prototype.onMouseUp = function(x, y)
{
	this.dragger.stop(x, y);
	this.rotator.stop(x, y);
	this.dragging = false;
	this.lastdx = 0;
}

SB.ModelControllerScript.prototype.onMouseScroll = function(delta)
{
	this.moveDir.set(0, 0, -delta);
	this.move(this.moveDir);
}

SB.ModelControllerScript.prototype.onKeyDown = function(keyCode, charCode)
{
	this.whichKeyDown = keyCode;
	
	this.timer.start();
}

SB.ModelControllerScript.prototype.onKeyUp = function(keyCode, charCode)
{
	this.lastdx = 0;
	this.whichKeyDown = 0;
	this.turnFraction = 0;
	
	this.timer.stop();
}

SB.ModelControllerScript.prototype.onKeyPress = function(keyCode, charCode)
{
}

SB.ModelControllerScript.prototype.onRotatorRotate = function(axis, delta)
{
	delta *= .666;
	
	if (delta != 0)
	{
		// this.controllerScript.transform.rotation.y -= delta;
		this.turnDir.set(0, -delta, 0);
		this.turn(this.lookDir);
	}
}

SB.ModelControllerScript.prototype.onDraggerMove = function(dx, dy)
{
	if (Math.abs(dx) <= 2)
		dx = 0;
	
	dx *= .002;
	
	if (dx)
	{
		this.lastdx = dx;
	}
	else if (this.lastdx && this.dragging)
	{
		dx = this.lastdx;
	}

	if (dx != 0)
	{
		// this.controllerScript.transform.position.z -= dx;
		this.turnDir.set(0, dx, 0);
		this.turn(this.turnDir);
	}	
}

SB.ModelControllerScript.prototype.onTimeChanged = function(t)
{
	var turnfraction = .0416;
	var movefraction = .1666;
	var turnamount = 0;
	var moveamount = 0;
	var handled = false;
	
	switch (this.whichKeyDown)
	{
    	case SB.Keyboard.KEY_LEFT : 
    		turnamount = +1 * turnfraction * this.turnSpeed;
			handled = true;
    		break;
    	case SB.Keyboard.KEY_UP : 
    		moveamount = -1 * movefraction * this.walkSpeed;
			handled = true;
    		break;
    	case SB.Keyboard.KEY_RIGHT : 
    		turnamount = -1 * turnfraction * this.turnSpeed;
			handled = true;
    		break;
    	case SB.Keyboard.KEY_DOWN : 
    		moveamount = +1 * movefraction * this.walkSpeed;
			handled = true;
    		break;
	}

	if (!handled)
	{
		switch (String.fromCharCode(this.whichKeyDown))
		{
	    	case 'A' :
	    		turnamount = +1 * turnfraction * this.turnSpeed;
	    		handled = true;
	    		break;
	    		
	    	case 'W' :
	    		moveamount = -1 * movefraction * this.walkSpeed;
	    		handled = true;
	    		break;
	    	case 'D' :
	    		turnamount = -1 * turnfraction * this.turnSpeed;
				handled = true;
	    		break;
	    	case 'S' :
	    		moveamount = +1 * movefraction * this.walkSpeed;
				handled = true;
	    		break;
	    		
	    	default : 
	    		break;
		}
	}

	if (moveamount)
	{
		this.moveDir.set(0, 0, moveamount);
		this.move(this.moveDir);
	}
	
	if (turnamount)
	{
		this.turnDir.set(0, turnamount, 0);
		this.turn(this.turnDir);
	}
}

SB.ModelControllerScript.prototype.onTimeFractionChanged = function(fraction)
{
	this.turnFraction = fraction;
}

