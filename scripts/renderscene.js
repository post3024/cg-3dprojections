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
            type: 'parallel',
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
    // step 1: calculate time (time since start)
    // step 2: transform models based on time
    // step 3: draw scene
    // step 4: request next animation frame (recursively calling same function)


    var time = timestamp - start_time;

    // ... step 2

    DrawScene();

    //window.requestAnimationFrame(Animate);
}

// Main drawing code - use information contained in variable `scene`
// remember to convert from homogeneous to cartesian
function DrawScene() {
    // If 'parallel' type, apply parallel projection
    if(scene.view.type === "parallel") {
      // Step 1: Go through each model within the scene and then each vertex
      // Create transform Matrix
      var transformPar = new Matrix(4, 4);
      Mat4x4Parallel(transformPar, scene.view.prp, scene.view.srp, scene.view.vup, scene.view.clip);

      for(var i = 0; i < scene.models.length; i++) {
        for(var j = 0; j < scene.models[i].vertices.length; j++) {
          // Step 2: Multiply each vertex by Mat4x4Parallel
          scene.models[i].vertices[j] = Matrix.multiply([transformPar, scene.models[i].vertices[j]]);


        }
      }
      // Step 3: Implement the 3D clipping algorithm
      for(var i = 0; i < scene.models.length; i++) {
        for(var j = 0; j < scene.models[i].edges.length; j++) {
          for(var k = 0; k < scene.models[i].edges[j].length - 1; k++) {
            var indexPt0 = scene.models[i].edges[j][k];
            var indexPt1 = scene.models[i].edges[j][k+1];
            var line = clipPar(scene.models[i].vertices[indexPt0], scene.models[i].vertices[indexPt1]);
            scene.models[i].vertices[indexPt0] = line.pt0;
            scene.models[i].vertices[indexPt1] = line.pt1;
          }
        }
      }

      // Step 4: Apply the Mat4x4MPar matrix to each vertex to do projection
      var mpar = new Matrix(4, 4);
      Mat4x4MPar(mpar);
      var projToWindow = new Matrix(4, 4);
      projToWindow.values = [[view.width/2, 0,             0, view.width/2],
                             [0,            view.height/2, 0, view.height/2],
                             [0,            0,             1, 0],
                             [0,            0,             0, 1]];
      for(var i = 0; i < scene.models.length; i++) {
        for(var j = 0; j < scene.models[i].vertices.length; j++) {
          scene.models[i].vertices[j] = Matrix.multiply([mpar, scene.models[i].vertices[j]]);
          scene.models[i].vertices[j] = Matrix.multiply([projToWindow, scene.models[i].vertices[j]]);
        }
      }
    }
    // If 'perspective' type, apply perspective projection
    else if (scene.view.type === "perspective") {
      // Step 1: Go through each model within the scene, and then through each vertex
      // Step 2: Multiple each vertex by Mat4x4Perspective
      // Step 3: Implement the 3D clipping algorithm
      // Step 4: Apply the Mat4x4MPer matrix to each vertex to do projection
    }

    // Draw 2D lines
    for(var i = 0; i < scene.models.length; i++) {
      for(var j = 0; j < scene.models[i].edges.length; j++) {
        for(var k = 0; k < scene.models[i].edges[j].length - 1; k++) {
          var indexPt0 = scene.models[i].edges[j][k];
          var indexPt1 = scene.models[i].edges[j][k+1];
          drawLine(scene.models[i].vertices[indexPt0], scene.models[i].vertices[indexPt1], '#4287f5');
        }
      }
    }
    console.log(scene.models[0].vertices);
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

// Ask about what z value is
// Calculates the outcode for a perspective projection
/*
function outcodePer(pt) {
	var outcode = 0;
	if (pt.x < view.x_min) outcode += LEFT;
	else if (pt.x > view.x_max) outcode += RIGHT;
	if (pt.y < view.y_min) outcode += BOTTOM;
	else if (pt.y > view.y_max) outcode += TOP;
//  if (pt.z < view.z_)

	return outcode;
}
*/

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
      // ????????????
      line = {pt0: endpt0, pt1: endpt1};
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
/*

function clipPer(pt0, pt1, view) {
	var done = false;
	var line = null;
	var endpt0 = {x: pt0.x, y: pt0.y, z: pt0.z};
	var endpt1 = {x: pt1.x, y: pt1.y, z: pt1.z};
	var outcode0, outcode1, selected_outcode, t;
	while(!done) {
		outcode0 = outcode(endpt0, view);
		outcode1 = outcode(endpt1, view);

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
				t = (view.x_min - endpt0.x) / (endpt1.x - endpt0.x);
			}
			else if(selected_outcode >= RIGHT) {
				t = (view.x_max - endpt0.x) / (endpt1.x - endpt0.x);
			}
			else if(selected_outcode >= BOTTOM) {
				t = (view.y_min - endpt0.y) / (endpt1.y - endpt0.y);
			}
			else {
				t = (view.y_max - endpt0.y) / (endpt1.y - endpt0.y);
			}


			if(selected_outcode === outcode0) {
				endpt0.x = endpt0.x + t * (endpt1.x - endpt0.x);
				endpt0.y = endpt0.y + t * (endpt1.y - endpt0.y);
			}
			else {
				endpt1.x = endpt0.x + t * (endpt1.x - endpt0.x);
				endpt1.y = endpt0.y + t * (endpt1.y - endpt0.y);
			}
		}
	}
	return line;
}
*/

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
            else {
                scene.models[i].center = Vector4(scene.models[i].center[0],
                                                 scene.models[i].center[1],
                                                 scene.models[i].center[2],
                                                 1);
            }
            scene.models[i].matrix = new Matrix(4, 4);
        }
    };
    reader.readAsText(scene_file.files[0], "UTF-8");
}

// Called when user presses a key on the keyboard down
function OnKeyDown(event) {
    switch (event.keyCode) {
        case 37: // LEFT Arrow
            console.log("left");
            break;
        case 38: // UP Arrow
            console.log("up");
            break;
        case 39: // RIGHT Arrow
            console.log("right");
            break;
        case 40: // DOWN Arrow
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
