var Game = function(physics)
{
	this.physics = physics;
	
	this.leftDown = false;
	this.rightDown = false;
	this.spaceDown = false;
	this.lastFired =  new Date().getTime();
};

(function() {
	var b2Vec2 = Box2D.Common.Math.b2Vec2;
	INVADER = 0;
	PLAYER = 1;
	BULLET = 2;
	SHRAPNEL = 3;
	GROUND = 4;
	STATIC = 5;
	FORMATION = 6;
	BOMB = 7;
	
	var game;

  Game.prototype.step = function(dt)
  {
	this.handleUserInput(dt);
  }
	
	Game.prototype.keyDown = function(event)
	{
		var keyCode = ('which' in event) ? event.which : event.keyCode;
		if(keyCode == 37)
		{
			game.leftDown = true;
			return false;
		} 
		if(keyCode == 39)
		{
			game.rightDown = true;
			return false;
		} 
		if(keyCode == 32)		
		{
			game.spaceDown = true;
			return false;
		}
		return true;
	}
  
	Game.prototype.keyUp = function(event)
	{
		var keyCode = ('which' in event) ? event.which : event.keyCode;
		if(keyCode == 37)
		{
			game.leftDown = false;
			return false;
		} 
		if(keyCode == 39)
		{
			game.rightDown = false;
			return false;
		} 
		if(keyCode == 32)		
		{
			game.spaceDown = false;
			return false;
		}
		return true;
	}
  
	Game.prototype.handleUserInput = function(dt)
	{
		if(this.leftDown)
		{
			var joint = game.player.joint;
			var pos = joint.GetTarget();
			joint.SetTarget(new b2Vec2(pos.x - dt * 10, pos.y));
		} 
		else if(this.rightDown)
		{
			var joint = game.player.joint;
			var pos = joint.GetTarget();
			joint.SetTarget(new b2Vec2(pos.x + dt * 10, pos.y));
		} 
		if(this.spaceDown)
		{
			var joint = game.player.joint;
			var pos = joint.GetTarget();
			var dFire = ((new Date().getTime()) - this.lastFired) / 1000;
			
			if(dFire >= 0.3)
			{
				var bullet = 
				  new Body(physics, { color: "green", type: "dynamic", IsBullet: true, x: pos.x, y:pos.y-2, height: 1, width: 0.25 });	
				bullet.body.ApplyImpulse({x:0,y:-80}, bullet.body.GetWorldCenter());	bullet.invaderType = BULLET;
				this.lastFired = new Date().getTime();
			}
			return false;
		} 
		
		return true;
	}
	
	Game.prototype.draw = function()
	{
	}
	
	Game.prototype.setup = function()
	{
		game = this;
		
		this.player = new Body(this.physics, { color: "green", x: 20, y: 29.5, height: 1,  width: 5 });
		this.player.invaderType = PLAYER;

		var jointDefinition = new Box2D.Dynamics.Joints.b2MouseJointDef();
		jointDefinition.bodyA = this.physics.world.GetGroundBody();
		jointDefinition.bodyB = this.player.body;
		jointDefinition.target.Set(20,29.5);
		jointDefinition.maxForce = 100000;
		jointDefinition.timeStep = this.physics.stepAmount;
		this.player.joint = this.physics.world.CreateJoint(jointDefinition);
		
		var floor = new Body(physics, { color: "green", type: "static", x: 0, y:30, height: 0.5, width: 80 });
			
		window.addEventListener("keydown", this.keyDown);
		window.addEventListener("keyup", this.keyUp);
	}
	
 
}());
