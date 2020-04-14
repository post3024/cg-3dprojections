var view;
var ctx;
var scene;
var start_time;
var LEFT = 32;
var RIGHT = 16;
var BOTTOM = 8;
var TOP = 4;
var NEAR = 2;
var FAR = 1;

// Initialization function - called when web page loads
function Init() {
    var w = 800;
    var h = 600;
    view = document.getElementById('view');
    view.width = w;
    view.height = h;

    ctx = view.getContext('2d');

    // initial scene... feel free to change this
    scene = {
        view: {
          type: 'perspective',
          prp: Vector3(44, 20, -16),
          srp: Vector3(20, 20, -40),
          vup: Vector3(0, 1, 0),
          clip: [-19, 5, -10, 8, 12, 100]
        },
        models: [
            {
                type: 'generic',
                vertices: [
                    Vector4( 0,  0, -30, 1),
                    Vector4(20,  0, -30, 1),
                    Vector4(20, 12, -30, 1),
                    Vector4(10, 20, -30, 1),
                    Vector4( 0, 12, -30, 1),
                    Vector4( 0,  0, -60, 1),
                    Vector4(20,  0, -60, 1),
                    Vector4(20, 12, -60, 1),
                    Vector4(10, 20, -60, 1),
                    Vector4( 0, 12, -60, 1)
                ],
                edges: [
                    [0, 1, 2, 3, 4, 0],
                    [5, 6, 7, 8, 9, 5],
                    [0, 5],
                    [1, 6],
                    [2, 7],
                    [3, 8],
                    [4, 9]
                ],
                matrix: new Matrix(4, 4)
            }
        ]
    };

    // event handler for pressing arrow keys
    document.addEventListener('keydown', OnKeyDown, false);

    // start animation loop
    start_time = performance.now(); // current timestamp in milliseconds
   window.requestAnimationFrame(Animate);

}

// Animation loop - repeatedly calls rendering code
function Animate(timestamp) {
    // clear canvas each animation
    ctx.clearRect(0, 0, view.width, view.height);

    // step 1: calculate time (time since start)
    var time = timestamp - start_time;

    // step 2: transform models based on time
    var degreePerSec, degree;
    var rotate = new Matrix(4, 4);
    var translateToOrigin = new Matrix(4, 4);
    var translateBack = new Matrix(4, 4);

    for(var i = 0; i < scene.models.length; i++) {
      if(scene.models[i].animation) {
        Mat4x4Translate(translateToOrigin, -scene.models[i].center[0], -scene.models[i].center[1], -scene.models[i].center[2]);
        Mat4x4Translate(translateBack, scene.models[i].center[0], scene.models[i].center[1], scene.models[i].center[2]);
        degreePerSec = 360 * scene.models[i].animation.rps;
        console.log("Degree per sec:", degreePerSec);
        degree = (degreePerSec * (time / 1000)) % 360;
        //degree = ((time*1000) % scene.models[i].animation.rps) / 2*Math.PI;
        console.log("degree: ", degree);
        if(scene.models[i].animation.axis === 'x') {
          Mat4x4RotateX(rotate, degree * Math.PI / 180);
        }
        else if(scene.models[i].animation.axis === 'y') {
          Mat4x4RotateY(rotate, degree * Math.PI / 180);
        }
        else {
          Mat4x4RotateZ(rotate, degree * Math.PI / 180);
        }

        for(var j = 0; j < scene.models[i].vertices.length; j++) {
          scene.models[i].vertices[j] = Matrix.multiply([translateBack, rotate, translateToOrigin, scene.models[i].vertices[j]]);
        }
      }
    }

    // step 3: draw scene
    DrawScene();

    // step 4: request next animation frame (recursively calling same function)
    window.requestAnimationFrame(Animate);

}

// Main drawing code - use information contained in variable `scene`
// remember to convert from homogeneous to cartesian
function DrawScene() {
    console.log(scene.models[0].edges);
    var transform = new Matrix(4,4);
    var projection = new Matrix(4,4);
    var projToWindow = new Matrix(4, 4);
    projToWindow.values = [[view.width/2, 0,             0, view.width/2],
                           [0,            view.height/2, 0, view.height/2],
                           [0,            0,             1, 0],
                           [0,            0,             0, 1]];

    // If 'parallel' type, use parallel projection
    if(scene.view.type === 'parallel'){
      Mat4x4Parallel(transform, scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
      Mat4x4MPar(projection);
    }
    // else use perspective projection
    else{
      Mat4x4Perspective(transform, scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);
      Mat4x4MPer(projection);
    }


    // Step 1: Go through each model within the scene and then each vertex
    var transformModelVert = [];
    for(var i = 0; i < scene.models.length; i++) {
      transformModelVert.push([]);
      for(var j = 0; j < scene.models[i].vertices.length; j++) {
        // Step 2: Multiply each vertex by transform matrix
        transformModelVert[i].push(Matrix.multiply([transform, scene.models[i].vertices[j]]));

      }
    }
    //console.log("transformed vertices: ", transformModelVert);

    // Step 3: Implement the 3D clipping algorithm
    for(var i = 0; i < scene.models.length; i++) {
      for(var j = 0; j < scene.models[i].edges.length; j++) {
        for(var k = 0; k < scene.models[i].edges[j].length - 1; k++) {
          var indexPt0 = scene.models[i].edges[j][k];
          var indexPt1 = scene.models[i].edges[j][k+1];
          var line;

          if(scene.view.type === 'parallel'){
            line = clipPar(transformModelVert[i][indexPt0], transformModelVert[i][indexPt1]);
          } else {
            //console.log(transformModelVert[i][indexPt0], transformModelVert[i][indexPt1]);
            line = clipPer(transformModelVert[i][indexPt0], transformModelVert[i][indexPt1]);
          }

          //console.log(line);
          //Step 4: if line not null continue with projection
          if (line != null) {
            // multiply each vertex by the projection Matrix
            var pt0 = Matrix.multiply([projToWindow, projection, line.pt0]);
            var pt1 = Matrix.multiply([projToWindow, projection, line.pt1]);
            //console.log(pt0, pt1);
            // draw line from point 0 to point 1
            drawLine(pt0, pt1, '#4287f5');
          }
        }
      }
    }
}

// Draws a 2D line from pt0 to pt1 in indicated color
function drawLine(pt0, pt1, color) {
	ctx.strokeStyle = color;
	ctx.beginPath();
  // Change to cartesian points
  pt0.x = pt0.x/pt0.w;
  pt0.y = pt0.y/pt0.w;
  pt1.x = pt1.x/pt1.w;
  pt1.y = pt1.y/pt1.w;
	ctx.moveTo(pt0.x, pt0.y);
	ctx.lineTo(pt1.x, pt1.y);
	ctx.stroke();

	ctx.fillStyle = '#000000';
	ctx.fillRect(pt0.x - 3, pt0.y - 3, 6, 6);
	ctx.fillRect(pt1.x - 3, pt1.y - 3, 6, 6);
}

// Calculates the outcode for the parallel projection
function outcodePar(pt) {
	var outcode = 0;
	if (pt.x < -1) outcode += LEFT;
	else if (pt.x > 1) outcode += RIGHT;
	if (pt.y < -1) outcode += BOTTOM;
	else if (pt.y > 1) outcode += TOP;
  if (pt.z > 0) outcode += NEAR;
  else if (pt.z < -1) outcode += FAR;

	return outcode;
}

// Calculates the outcode for a perspective projection
function outcodePer(pt) {
	var outcode = 0;
  var zMin = -scene.view.clip[4]/scene.view.clip[5];
	if (pt.x < pt.z) outcode += LEFT;
  else if (pt.x > -pt.z) outcode += RIGHT;
  if (pt.y < pt.z) outcode += BOTTOM;
  else if (pt.y > -pt.z) outcode += TOP;
  if (pt.z > zMin) outcode += NEAR;
  else if (pt.z < -1) outcode += FAR;

	return outcode;
}

// Clips the 3D line against the parallel view volume
function clipPar(pt0, pt1) {
	var done = false;
	var line = null;
	var endpt0 = new Vector4(pt0.x, pt0.y, pt0.z, pt0.w);
	var endpt1 = new Vector4(pt1.x, pt1.y, pt1.z, pt1.w);
	var outcode0, outcode1, selected_outcode, t;
	while(!done) {
		outcode0 = outcodePar(endpt0);
		outcode1 = outcodePar(endpt1);

		// check for a trivial accept
		if((outcode0 | outcode1) === 0) {
			done = true;
			line = {pt0: endpt0, pt1: endpt1};
		}
		// check for a trivial reject
		else if((outcode0 & outcode1) !== 0) {
			done = true;
		}
		else {
			// select an enpoint outside the view
			// if pt0 is outside the view, use pt0
			if(outcode0 !== 0) {
				selected_outcode = outcode0;
			}
			// else we use pt1
			else {
				selected_outcode = outcode1;
			}

			//find first bit set to 1 in the selected endpoint's outcode
			if(selected_outcode >= LEFT) {
				t = (-1 - endpt0.x) / (endpt1.x - endpt0.x);
			}
			else if(selected_outcode >= RIGHT) {
				t = (1 - endpt0.x) / (endpt1.x - endpt0.x);
			}
			else if(selected_outcode >= BOTTOM) {
				t = (-1 - endpt0.y) / (endpt1.y - endpt0.y);
			}
			else if(selected_outcode >= TOP){
				t = (1 - endpt0.y) / (endpt1.y - endpt0.y);
			}
      else if(selected_outcode >= NEAR) {
        t = (0 - endpt0.z) / (endpt1.z - endpt0.z);
      }
      else {
        t = (-1 - endpt0.z) / (endpt1.z - endpt0.z);
      }

			if(selected_outcode === outcode0) {
				endpt0.x = endpt0.x + t * (endpt1.x - endpt0.x);
				endpt0.y = endpt0.y + t * (endpt1.y - endpt0.y);
        endpt0.z = endpt0.z + t * (endpt1.z - endpt0.z);
			}
			else {
				endpt1.x = endpt0.x + t * (endpt1.x - endpt0.x);
				endpt1.y = endpt0.y + t * (endpt1.y - endpt0.y);
        endpt1.z = endpt0.z + t * (endpt1.z - endpt0.z);
			}
		}
	}
	return line;
}

// Clips the 3D line against the perspective view volume
function clipPer(pt0, pt1) {
	var done = false;
	var line = null;
	var endpt0 = new Vector4(pt0.x, pt0.y, pt0.z, pt0.w);
	var endpt1 = new Vector4(pt1.x, pt1.y, pt1.z, pt1.w);
	var outcode0, outcode1, selected_outcode, t;
	while(!done) {
		outcode0 = outcodePer(endpt0);
		outcode1 = outcodePer(endpt1);
		// check for a trivial accept
		if((outcode0 | outcode1) === 0) {
			done = true;
			line = {pt0: endpt0, pt1: endpt1};
		}
		// check for a trivial reject
		else if((outcode0 & outcode1) !== 0) {
			done = true;
		}
		else {
			// select an enpoint outside the view
			// if pt0 is outside the view, use pt0
			if(outcode0 !== 0) {
				selected_outcode = outcode0;
			}
			// else we use pt1
			else {
				selected_outcode = outcode1;
			}

			//find first bit set to 1 in the selected endpoint's outcode
      var changeX = endpt1.x-endpt0.x;
      var changeY = endpt1.y-endpt0.y;
      var changeZ = endpt1.z-endpt0.z;
      var zMin = -scene.view.clip[4]/scene.view.clip[5];

			if(selected_outcode >= LEFT) {
        t = ( -endpt0.x+endpt0.z) / (changeX-changeZ);
      }
      else if(selected_outcode >= RIGHT) {
        t = ( endpt0.x+endpt0.z) / (-changeX-changeZ);
      }
      else if(selected_outcode >= BOTTOM) {
        t = ( -endpt0.y+endpt0.z) / (changeY-changeZ);
      }
      else if(selected_outcode >= TOP){
        t = (endpt0.y+endpt0.z) / (-changeY-changeZ);
      }
      else if(selected_outcode >= NEAR) {
        t = (endpt0.z-zMin) / (-changeZ);
      }
      else {
        t = (-endpt0.z-1) / (changeZ);
      }

			if(selected_outcode === outcode0) {
				endpt0.x = endpt0.x + t * (endpt1.x - endpt0.x);
				endpt0.y = endpt0.y + t * (endpt1.y - endpt0.y);
        endpt0.z = endpt0.z + t * (endpt1.z - endpt0.z);
			}
			else {
				endpt1.x = endpt0.x + t * (endpt1.x - endpt0.x);
				endpt1.y = endpt0.y + t * (endpt1.y - endpt0.y);
        endpt1.z = endpt0.z + t * (endpt1.z - endpt0.z);
			}
		}
	}
	return line;
}


// Called when user selects a new scene JSON file
function LoadNewScene() {
    var scene_file = document.getElementById('scene_file');

    console.log(scene_file.files[0]);

    var reader = new FileReader();
    reader.onload = (event) => {
        scene = JSON.parse(event.target.result);
        scene.view.prp = Vector3(scene.view.prp[0], scene.view.prp[1], scene.view.prp[2]);
        scene.view.srp = Vector3(scene.view.srp[0], scene.view.srp[1], scene.view.srp[2]);
        scene.view.vup = Vector3(scene.view.vup[0], scene.view.vup[1], scene.view.vup[2]);

        for (let i = 0; i < scene.models.length; i++) {
            if (scene.models[i].type === 'generic') {
                for (let j = 0; j < scene.models[i].vertices.length; j++) {
                    scene.models[i].vertices[j] = Vector4(scene.models[i].vertices[j][0],
                                                          scene.models[i].vertices[j][1],
                                                          scene.models[i].vertices[j][2],
                                                          1);
                }
            }
            // generate vertices array and edge list for a cube
            else if (scene.models[i].type === 'cube') {
              var center = scene.models[i].center;
              var width = scene.models[i].width;
              var height = scene.models[i].height;
              var depth = scene.models[i].depth;
              scene.models[i].vertices =[];
              scene.models[i].vertices.push(Vector4(center[0] - width/2, center[1] - height/2, center[2] + depth/2, 1)); // bottom front left
              scene.models[i].vertices.push(Vector4(center[0] + width/2, center[1] - height/2, center[2] + depth/2, 1)); // bottom front right
              scene.models[i].vertices.push(Vector4(center[0] + width/2, center[1] - height/2, center[2] - depth/2, 1)); // bottom back right
              scene.models[i].vertices.push(Vector4(center[0] - width/2, center[1] - height/2, center[2] - depth/2, 1)); // bottom back left
              scene.models[i].vertices.push(Vector4(center[0] - width/2, center[1] + height/2, center[2] + depth/2, 1)); // top front left
              scene.models[i].vertices.push(Vector4(center[0] + width/2, center[1] + height/2, center[2] + depth/2, 1)); // top front right
              scene.models[i].vertices.push(Vector4(center[0] + width/2, center[1] + height/2, center[2] - depth/2, 1)); // top back right
              scene.models[i].vertices.push(Vector4(center[0] - width/2, center[1] + height/2, center[2] - depth/2, 1)); // top back left
              scene.models[i].edges =[];
              scene.models[i].edges.push([0, 1, 2, 3, 0]);
              scene.models[i].edges.push([4, 5, 6, 7, 4]);
              scene.models[i].edges.push([0, 4]);
              scene.models[i].edges.push([1, 5]);
              scene.models[i].edges.push([2, 6]);
              scene.models[i].edges.push([3, 7]);
            }
            // generate vertices array and edge list for a cylinder
            else if (scene.models[i].type === 'cylinder') {
              scene.models[i].vertices =[];
              scene.models[i].edges =[];
              var theta = 360 / scene.models[i].sides;
              var center = scene.models[i].center;
              var radius = scene.models[i].radius;
              var height = scene.models[i].height;
              var x = center[0] + radius;
              var y_low = center[1] - height/2;
              var y_high = center[1] + height/2;
              var z = center[2];
              var currentAngle = theta;
              scene.models[i].vertices.push(Vector4(x, y_low, z, 1));
              scene.models[i].vertices.push(Vector4(x, y_high, z, 1));
              scene.models[i].edges.push([0]); // bottom circle
              scene.models[i].edges.push([1]); // top circle
              scene.models[i].edges.push([0, 1]);
              for(var j = 2; j < scene.models[i].sides * 2; j += 2) {
                  var x1 = center[0]  + radius * Math.cos(currentAngle * Math.PI / 180);
                  var z1 = center[2] + radius * Math.sin(currentAngle * Math.PI / 180);
                  scene.models[i].vertices.push(Vector4(x1, y_low, z1, 1));
                  scene.models[i].vertices.push(Vector4(x1, y_high, z1, 1));
                    scene.models[i].edges[0].push(j);
                    scene.models[i].edges[1].push(j+1);

                  scene.models[i].edges.push([j, j+1]);
                  currentAngle += theta;
              }
              scene.models[i].edges[0].push(0); // bottom circle
              scene.models[i].edges[1].push(1);
            }

            // generate vertices array and edge list for a cone
            else if (scene.models[i].type === 'cone') {
              scene.models[i].vertices =[];
              scene.models[i].edges =[];
              var theta = 360 / scene.models[i].sides;
              var center = scene.models[i].center;
              var radius = scene.models[i].radius;
              var height = scene.models[i].height;
              var x = center[0] + radius;
              var y_low = center[1] - height/2;
              var z = center[2];
              var currentAngle = theta;
              scene.models[i].vertices.push(Vector4(center[0], center[1] + height/2, center[2], 1));
              scene.models[i].vertices.push(Vector4(x, y_low, z, 1));
              scene.models[i].edges.push([0, 1]);
              scene.models[i].edges.push([1]);
              for(var j = 0; j < scene.models[i].sides; j++) {
                  var x1 = center[0]  + radius * Math.cos(currentAngle * Math.PI / 180);
                  var z1 = center[2] + radius * Math.sin(currentAngle * Math.PI / 180);
                  scene.models[i].vertices.push(Vector4(x1, y_low, z1, 1));
                  scene.models[i].edges[1].push(j+2);
                  scene.models[i].edges.push([j+2, 0]);
                  currentAngle += theta;
              }
            }

            // generate vertices array and edge list for a sphere
            else if (scene.models[i].type === 'sphere') {
              scene.models[i].vertices =[];
              scene.models[i].edges =[];
              var center = scene.models[i].center;
              var radius = scene.models[i].radius;
              var baseCircleVertices = [];

              // create a circle in the xy plane
              var theta = 360 / (scene.models[i].stacks * 2);
              var x = center[0] + radius;
              var y = center[1];
              var currentAngle = theta;
              baseCircleVertices.push(Vector4(x, y, center[2], 1));
              scene.models[i].vertices.push(Vector4(x, y, center[2], 1));
              scene.models[i].edges.push([0]);
                for(var j = 1; j < scene.models[i].stacks * 2; j++) {
                    var x1 = center[0]  + radius * Math.cos(currentAngle * Math.PI / 180);
                    var y1 = center[1] + radius * Math.sin(currentAngle * Math.PI / 180);
                    baseCircleVertices.push(Vector4(x1, y1, center[2], 1));
                    scene.models[i].vertices.push(Vector4(x1, y1, center[2], 1));
                    scene.models[i].edges[0].push(j);
                    currentAngle += theta;
              }
              scene.models[i].edges[0].push(0);

              var degree = 360 / scene.models[i].slices;
              var translateToOrigin = new Matrix(4, 4);
              var rotate = new Matrix(4, 4);
              var translateBack = new Matrix(4, 4);
              Mat4x4Translate(translateToOrigin, -center[0], -center[1], -center[2]);
              Mat4x4RotateY(rotate, degree * Math.PI / 180);
              Mat4x4Translate(translateBack, center[0], center[1], center[2]);

              for(var k = 0; k < scene.models[i].slices - 1; k++) {
                scene.models[i].edges.push([]);
                var beginning_edge = scene.models[i].vertices.length;
                for(var l = 0; l < baseCircleVertices.length; l++) {
                  baseCircleVertices[l] = Matrix.multiply([translateBack, rotate, translateToOrigin, baseCircleVertices[l]]);
                  scene.models[i].vertices.push(baseCircleVertices[l]);

                  scene.models[i].edges[k+1].push(scene.models[i].vertices.length - 1);
                }
                scene.models[i].edges[k+1].push(beginning_edge);
              }

              var edges = [];
              for(var j = 0; j < scene.models[i].edges.length; j++) {
                edges.push(scene.models[i].edges[j]);
              }

              for(var j = 0; j < (scene.models[i].stacks * 2) + 1; j++) {
                scene.models[i].edges.push([]);
                for(var k = 0; k < edges.length; k++) {
                  scene.models[i].edges[scene.models[i].edges.length - 1].push(edges[k][j]);
                }
                scene.models[i].edges[scene.models[i].edges.length - 1].push(edges[0][j]);
              }

          }
            else {
                scene.models[i].center = Vector4(scene.models[i].center[0],
                                                 scene.models[i].center[1],
                                                 scene.models[i].center[2],
                                                 1);
            }
            scene.models[i].matrix = new Matrix(4, 4);
        }
        DrawScene();

    };
    reader.readAsText(scene_file.files[0], "UTF-8");
}

// Called when user presses a key on the keyboard down
function OnKeyDown(event) {
    switch (event.keyCode) {
        case 37: // LEFT Arrow
            var rotate = new Matrix(4, 4);
            var translate = new Matrix(4, 4);
            Mat4x4Translate(translate, -scene.view.prp.x, -scene.view.prp.y, -scene.view.prp.z);
            Mat4x4RotateY(rotate, -0.05);
            var srp = Vector4(scene.view.srp.x, scene.view.srp.y, scene.view.srp.z, 1);
            var prp = Vector4(scene.view.prp.x, scene.view.prp.y, scene.view.prp.z, 1);
            srp = Matrix.multiply([rotate, srp]);
            prp = Matrix.multiply([rotate, prp]);
            scene.view.srp.x = srp.x;
            scene.view.srp.y = srp.y;
            scene.view.srp.z = srp.z;
            scene.view.prp.x = prp.x;
            scene.view.prp.y = prp.y;
            scene.view.prp.z = prp.z;
            console.log("left");
            break;
        case 38: // UP Arrow
            scene.view.prp.y = scene.view.prp.y + 1;
            scene.view.srp.y = scene.view.srp.y + 1;
            console.log("up");
            break;
        case 39: // RIGHT Arrow
            var rotate = new Matrix(4, 4);
            var translate = new Matrix(4, 4);
            Mat4x4Translate(translate, -scene.view.prp.x, -scene.view.prp.y, -scene.view.prp.z);
            Mat4x4RotateY(rotate, 0.05);
            var srp = Vector4(scene.view.srp.x, scene.view.srp.y, scene.view.srp.z, 1);
            var prp = Vector4(scene.view.prp.x, scene.view.prp.y, scene.view.prp.z, 1);
            srp = Matrix.multiply([rotate, srp]);
            prp = Matrix.multiply([rotate, prp]);
            scene.view.srp.x = srp.x;
            scene.view.srp.y = srp.y;
            scene.view.srp.z = srp.z;
            scene.view.prp.x = prp.x;
            scene.view.prp.y = prp.y;
            scene.view.prp.z = prp.z;
            console.log("right");
            break;
        case 40: // DOWN Arrow
            scene.view.prp.y = scene.view.prp.y - 1;
            scene.view.srp.y = scene.view.srp.y - 1;
            console.log("down");
            break;

    }
}

// Draw black 2D line with red endpoints
function DrawLine(x1, y1, x2, y2) {
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = '#FF0000';
    ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
    ctx.fillRect(x2 - 2, y2 - 2, 4, 4);
}
