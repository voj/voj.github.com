var Game = function(physics)
{
	var b2Vec2 = Box2D.Common.Math.b2Vec2;
	var types = {	
		INVADER : 0,
		PLAYER : 1,
		BULLET : 2,
		SHRAPNEL : 3,
		GROUND : 4,
		STATIC : 5,
		FORMATION : 6,
		BOMB : 7
	}
	
	var self = this;

	this.physics = physics;
	
	this.invaders = [];
	this.garbageJoints = [];
	this.garbageBodies = [];
	this.explodeBodies = [];
	this.shrapnel = [];
	
	this.score = 0;
	this.lives = 3;
	
	this.formationDelta = 0;
	this.formationDirection = 1.5;
	
	this.leftDown = false;
	this.rightDown = false;
	this.spaceDown = false;
	this.lastFired =  new Date().getTime();
	this.lastBombed = new Date().getTime();
	

	this.handleBulletCollision = function(bullet, other)
	{
		if(other.invaderType == types.INVADER)
		{
			this.explodeBodies.push(other);
			this.score += 100;
		}
		else if(other.invaderType == types.SHRAPNEL)
		{
			this.garbageBodies.push(other);
			this.score += 5;
		}
		this.garbageBodies.push(bullet);
	};
	
	this.handlePlayerCollision = function(player, other)
	{
		if(other.invaderType == types.INVADER)
		{
			this.explodeBodies.push(other);
			this.score -= 100;
			this.lives--;
			this.explodeBodies.push(player);
		}		
	};
	
	this.handleBombCollision = function(bomb, other)
	{
		if(!bomb.exploded)
		{
			if(other.invaderType != types.INVADER)
			{
				this.explodeBodies.push(bomb);
				if(other.invaderType == types.PLAYER)
				{
					this.lives--;
					this.explodeBodies.push(other);
				}
				bomb.exploded = true;
			}
		}
	};

	function collision(contact,impulse) 
	{
		var bodyA = contact.GetFixtureA().GetBody().GetUserData();
		var bodyB = contact.GetFixtureB().GetBody().GetUserData();
			  
		if(bodyA.invaderType == types.BULLET)
		{
			self.handleBulletCollision(bodyA, bodyB);
		}
		else if(bodyB.invaderType == types.BULLET)
		{
			self.handleBulletCollision(bodyB, bodyA);
		}
		else if(bodyA.invaderType == types.BOMB)
		{
			self.handleBombCollision(bodyA, bodyB);
		}
		else if(bodyB.invaderType == types.BOMB)
		{
			self.handleBombCollision(bodyB, bodyA);
		}
		else if(bodyA.invaderType == types.PLAYER)
		{
			self.handlePlayerCollision(bodyA, bodyB);
		}
		else if(bodyB.invaderType == types.PLAYER)
		{
			self.handlePlayerCollision(bodyB, bodyA);
		}
	};
  
	this.destroyBody = function(body)
	{
		if(body.joint != null)
		{
			this.physics.world.DestroyJoint(body.joint);
			body.joint = null;
		}
		if(body.body != null)
		{
			this.physics.world.DestroyBody(body.body);
			body.body = null;
		}
	};
	
	this.cleanup = function()
	{
		for(var i = 0; i < this.garbageBodies.length; i++)
		{
			this.destroyBody(this.garbageBodies[i]);
		}
		this.garbageBodies = [];
		
		while(this.shrapnel.length > 150)
		{
			this.destroyBody(this.shrapnel.shift());
		}

		for(var i = 0; i < this.explodeBodies.length; i++)
		{
			var body = this.explodeBodies[i];
			if(body.body != null)
			{
				var pos = body.body.GetWorldCenter();
				var shrapnelCount = 10;
				var shrapnelForceX = 1;
				var shrapnelForceY = 1;
				var color = "white";
				if(body.invaderType == types.INVADER)
				{
					shrapnelCount = 30;
					shrapnelForceX = 40;
					shrapnelForceY = 0;
					color = "white";
				}
				else if(body.invaderType == types.BOMB)
				{
					shrapnelCount = 5;
					shrapnelForceX = 100;
					shrapnelForceY = 100;
					color = "red";
				}
				else if(body.invaderType == types.PLAYER)
				{
					shrapnelCount = 10;
					shrapnelForceX = 200;
					shrapnelForceY = 200;
					color = "green";
					pos = new b2Vec2(pos.x, pos.y - 1.1);
				}
				for(var c = 0; c < shrapnelCount; c++) {
					var angle = c*2*3.14/shrapnelCount;
					var radius = 0.1;
					var x = (Math.cos(angle) * radius);
					var y = (Math.sin(angle) * radius)
					var shrapnelObject = new Body(window.physics, { 'color': color, x: pos.x+x, y: pos.y+y, height: 0.5,  width: 0.5 });
					shrapnelObject.invaderType = this.SHRAPNEL;
					shrapnelObject.body.ApplyImpulse({'x': x * shrapnelForceX * Math.random(), 'y': x * shrapnelForceY * Math.random()}, shrapnelObject.body.GetWorldCenter());
					this.shrapnel.push(shrapnelObject);
				}			
				if(body.invaderType != types.PLAYER)
				{
					this.destroyBody(body);
				}
			}
		}
		this.explodeBodies = [];	
	};
	
	this.moveInvaders = function(dt)
	{
		var joint = this.invaderFormation.joint;
		var pos = joint.GetTarget();
		var down = 0;
		if(this.formationDelta < -3)
		{
			this.formationDirection = 1.5;
			down = 0.7;
		}
		else if (this.formationDelta > 3)
		{
			this.formationDirection = -1.5;
			down = 0.7;
		}
		this.formationDelta += (dt/this.formationDirection);
		joint.SetTarget(new b2Vec2(pos.x + (dt/this.formationDirection), pos.y + down));
	};
	
	this.dropBomb = function()
	{
		var dBomb = ((new Date().getTime()) - this.lastBombed) / 1000;
		
		if(dBomb >= 3)		
		{
			var dist = 1000000;
			var closest = null;
			var playerPos = this.player.body.GetWorldCenter();
			for(var i = 0; i < this.invaders.length; i++)
			{
				var body = this.invaders[i].body;
				if(body)
				{
					var pos = body.GetWorldCenter();
					var x = playerPos.x - pos.x;
					var y = playerPos.y - pos.y;
					var d = x * x + y * y;
					if(d < dist)
					{
						dist = d;
						closest = body;
					}
				}
			}
			if(closest)
			{
				var pos = closest.GetWorldCenter();
			
				var bomb = new Body(physics, { color: "red", type: "dynamic", IsBullet: true, x: pos.x, y:pos.y+1, height: 1, width: 0.25 });	
				bomb.invaderType = types.BOMB;
			}
			this.lastBombed = new Date().getTime();
		}
	};

	this.step = function(dt)
	{
		this.moveInvaders(dt);
		this.dropBomb();
		this.handleUserInput(dt);
		this.cleanup();
	};

	this.draw = function(context)
	{
		context.font="20px Arial";
		context.fillStyle = "green";
		context.fillText("Score " + this.score,100,50);
		context.fillText("Lives " + this.lives,500,50);
		
		if(this.lives < 1)
		{
			context.font="120px Arial";
			context.fillStyle = "green";
			context.fillText("GAME OVER",50,300);
		}
	};
	
	function keyDown(event)
	{
		var keyCode = ('which' in event) ? event.which : event.keyCode;
		if(keyCode == 37)
		{
			self.leftDown = true;
			return false;
		} 
		if(keyCode == 39)
		{
			self.rightDown = true;
			return false;
		} 
		if(keyCode == 32)		
		{
			self.spaceDown = true;
			return false;
		}
		return true;
	};
  
	function keyUp(event)
	{
		var keyCode = ('which' in event) ? event.which : event.keyCode;
		if(keyCode == 37)
		{
			self.leftDown = false;
			return false;
		} 
		if(keyCode == 39)
		{
			self.rightDown = false;
			return false;
		} 
		if(keyCode == 32)		
		{
			self.spaceDown = false;
			return false;
		}
		return true;
	};
  
	this.handleUserInput = function(dt)
	{
		var joint = this.player.joint;
		var pos = joint.GetTarget();
		if(this.leftDown)
		{
			joint.SetTarget(new b2Vec2(pos.x - dt * 10, pos.y));
		} 
		if(this.rightDown)
		{
			joint.SetTarget(new b2Vec2(pos.x + dt * 10, pos.y));
		} 
		if(this.spaceDown)
		{
			var dFire = ((new Date().getTime()) - this.lastFired) / 1000;
			
			if(dFire >= 0.3)
			{
				var bullet = new Body(physics, { color: "green", type: "dynamic", IsBullet: true, x: pos.x, y:pos.y-2, height: 1, width: 0.25 });	
				bullet.body.ApplyImpulse({x:0,y:-80}, bullet.body.GetWorldCenter());	
				bullet.invaderType = types.BULLET;
				this.lastFired = new Date().getTime();
			}
		} 
	};
	
	this.createInvader = function(img, xPos, yPos)
	{
		var invader = new Body(window.physics, { image: img, x: xPos, y: yPos, width: 5.56*0.7, height: 4.1*0.7, fixedRotation:true  });
		
		var distJointDef = new Box2D.Dynamics.Joints.b2DistanceJointDef();
		distJointDef.Initialize(invader.body,
		this.invaderFormation.body,
		new b2Vec2(xPos, yPos),
		new b2Vec2(xPos, yPos - 0.2));
		distJointDef.dampingRatio = 0.05;
		distJointDef.frequencyHz = 1;
		invader.joint = this.physics.world.CreateJoint(distJointDef);		
		invader.invaderType = types.INVADER;
		this.invaders.push(invader);
 	};
	
	this.setup = function()
	{

		this.invaderFormation = new Body(physics, { color: false, type: "dynamic", x: 0, y:0, height: 30, width: 80, fixedRotation:true  });
		this.invaderFormation.body.GetFixtureList().SetSensor(true);
		this.invaderFormation.invaderType = types.FORMATION;
		var jointDefinition = new Box2D.Dynamics.Joints.b2MouseJointDef();
		jointDefinition.bodyA = this.physics.world.GetGroundBody();
		jointDefinition.bodyB = this.invaderFormation.body;
		jointDefinition.target.Set(0,0);
		jointDefinition.maxForce = 100000;
		jointDefinition.timeStep = this.physics.stepAmount;
		this.invaderFormation.joint = this.physics.world.CreateJoint(jointDefinition);

		this.player = new Body(this.physics, { color: "green", x: 20, y: 29.5, height: 1,  width: 5 });

		var jointDefinition = new Box2D.Dynamics.Joints.b2MouseJointDef();
		jointDefinition.bodyA = this.physics.world.GetGroundBody();
		jointDefinition.bodyB = this.player.body;
		jointDefinition.target.Set(20,29.5);
		jointDefinition.maxForce = 100000;
		jointDefinition.timeStep = this.physics.stepAmount;
		this.player.joint = this.physics.world.CreateJoint(jointDefinition);
		this.player.invaderType = types.PLAYER;
		
		var floor = new Body(physics, { color: "green", type: "static", x: 0, y:30, height: 0.5, width: 80 });
				
		var img = new Image();
		img.addEventListener("load", function() {

			for(var x = 5; x < 36; x+=5)
			{
				for(var y = 8; y < 19; y+=5)
				{
					self.createInvader(img, x, y);
				}
			}
			
			window.addEventListener("keydown", keyDown);
			window.addEventListener("keyup", keyUp);
			
			var collisionListener = new Box2D.Dynamics.b2ContactListener();
			collisionListener.PostSolve = collision;
			self.physics.world.SetContactListener(collisionListener);
			
		});
		img.src = "images/invader2.jpg";
	};
};