// LightedCube.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = 
  'attribute vec4 a_Position;\n' + 
  'attribute vec4 a_Color;\n' + 
  'attribute vec4 a_Normal;\n' +        
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform vec3 u_LightColor;\n' +     
  'uniform vec3 u_LightDirection;\n' + 
  'uniform vec3 u_AmbientLight;\n' +  // Ambient light color
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ViewMatrix * u_MvpMatrix * a_Position ;\n' +
  // Make the length of the normal 1.0
  '  vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);\n' +
  // Dot product of the light direction and the orientation of a surface (the normal) 
  '  float nDotL = max(dot(u_LightDirection, normal), 0.0);\n' +
  // Calculate the color due to diffuse reflection  
  // $I_d = L_dK_d \hat{L}\cdot\hat{N}
  '  vec3 diffuse = u_LightColor * a_Color.rgb * nDotL;\n' +
  // Calculate the color due to ambient reflection
  '  vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +
  //  Add the surface colors due to diffuse reflection and ambient reflection
  '  v_Color = vec4(diffuse + ambient, a_Color.a);\n' + 
  '}\n';

// Fragment shader program
var FSHADER_SOURCE = 
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

var mvpMatrix = new Matrix4(); // Model view projection matrix
var viewMatrix = new Matrix4();  // View/Eye matrix
var normalsMatrix = new Matrix4();  // Transformation matrix for normals
var objectArray = []; // Temp storage for the mvpMatrix that is ready to be rendered

// Default Rotation = 0 degrees
// keydown function indicated the new angle for the obj to be rendered at
var xAngle = 0.0; 
var yAngle = 0.0;  

// Bool for if obj should be rendered in Wireframe (true) or Flat Shadding (false)
var wireframeToggle = false; 
var initialTime = 0;

const maxScale = 2;
const maxMove = [3, 3, 3];

let wireframe = false;
let scaleAmount = 1;
let moveAmount = new Float32Array([-1.0, 0.0, 0.0]);  // x, y, z
let rotation = [0, 0, 0];

var toggleAmbient = true; 
var toggleDiffused = true; 
var toggleSpecular = true; 


function main() {
  // webgl starter code
  // Initializes the canvas and the shaders
  // Sets the webgl context
  var canvas = document.getElementById('webgl');
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Your browser does not support HTML5');
    return;
  }
  
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }


  // Set the clear color and enable the depth test
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Get the storage locations of uniform attributes and so on
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');
  var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
  if (!u_MvpMatrix || !u_ViewMatrix || !u_NormalMatrix || !u_LightColor || !u_LightDirection || !u_AmbientLight) { 
    console.log('Failed to get the storage Location');
    return;
  }

  // Set the light color (white)
  gl.uniform3f(u_LightColor, 1, 1, 1);
  // Set the light direction (in the world coordinate)
  gl.uniform3f(u_LightDirection, 1, 1, 1);
  // Set the ambient light
  gl.uniform3f(u_AmbientLight, 0.2, 0.2, 0.2);
  
  // Calculate the view projection matrix
  viewMatrix.setLookAt(0, 0, 10, 0, 0, 0, 0, 1, 0);
  viewMatrix.setPerspective(100, canvas.width/canvas.height, 1, 100);
  // Pass the model and view projection matrixes to the variables u_ViewMatrix and u_MvpMatrix
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements)


  // Listener for when the checkbox is checked
  // Checked = Flat Surface Render
  // Not Checked = Wireframe Render
  var checkbox = document.getElementById('toggleCheckbox');
  checkbox.addEventListener('click', function(){
    switchRender(gl, u_MvpMatrix, u_NormalMatrix)
  });
  var checkbox = document.getElementById('toggleAmbient');
  checkbox.addEventListener('click', function(){
    toggleAmbient = toggleAmbient ? false : true;
    if (!toggleAmbient) {
      gl.uniform3f(u_AmbientLight, 0, 0, 0);
    }
    else
    gl.uniform3f(u_AmbientLight, 0.2, 0.2, 0.2);
      renderSOR(gl, u_MvpMatrix, u_NormalMatrix);
  });

  var checkbox = document.getElementById('toggleDiffused');
  checkbox.addEventListener('click', function(){
    toggleDiffused = toggleDiffused ? false : true;
    if (!toggleDiffused) {
      gl.uniform3f(u_LightColor, 0, 0, 0);
    }
    else
      gl.uniform3f(u_LightColor, 1.0, 1,0, 1.0);
      renderSOR(gl, u_MvpMatrix, u_NormalMatrix);
  });

  var checkbox = document.getElementById('toggleSpecular');
  checkbox.addEventListener('click', function(){
    toggleSpecular = toggleSpecular ? false : true;
    switchRender(gl, u_MvpMatrix, u_NormalMatrix)
  });


  // Listener for when an arrow key is pressed
  document.onkeydown = function(ev){
    keydown(ev, gl, u_MvpMatrix, u_NormalMatrix);
  };

  document.getElementById("scale").addEventListener("input", function() {
    scaleAmount = this.value / (100 / maxScale);
    console.log(scaleAmount);
    renderSOR(gl, u_MvpMatrix, u_NormalMatrix);
  });

  document.getElementById("moveX").addEventListener("input", function() {
    moveAmount[0] = this.value / (100 / maxMove[0]);
    console.log(moveAmount[0]);
    renderSOR(gl, u_MvpMatrix, u_NormalMatrix);
  });

  document.getElementById("moveY").addEventListener("input", function() {
    moveAmount[1] = this.value / (100 / maxMove[1]);
    console.log(moveAmount[1]);
    renderSOR(gl, u_MvpMatrix, u_NormalMatrix);
  });

  document.getElementById("moveZ").addEventListener("input", function() {
    moveAmount[2] = this.value / (100 / maxMove[2]);
    console.log( moveAmount[2]);
    renderSOR(gl, u_MvpMatrix, u_NormalMatrix);
  });

  document.getElementById("rotationX").addEventListener("input", function() {
    rotation[0] = this.value;
    console.log(rotation[0]);
    renderSOR(gl, u_MvpMatrix, u_NormalMatrix);
  });

  document.getElementById("rotationY").addEventListener("input", function() {
    rotation[1] = this.value;
    console.log(rotation[1]);
    renderSOR(gl, u_MvpMatrix, u_NormalMatrix);
  });

  document.getElementById("rotationZ").addEventListener("input", function() {
    rotation[2] = this.value;
    console.log(rotation[2]);
    renderSOR(gl, u_MvpMatrix, u_NormalMatrix);
  });

  // Draw the scene repeatedly
  // Loops so it will continously draw the object
  // Updates positon if arrow keys are pressed
  // Checks if the scene should be rendered in Wireframe or Flat Shadding
  
  function render(now) {
    renderSOR(gl, u_MvpMatrix, u_NormalMatrix)

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

function initVertexBuffersCube(gl) {
  // Create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  
  // Extend the list of polygons from our OBJ file to include the normal
  var vertices = new Float32Array([   // Coordinates
     0.5, 0.5, 0.5,  -0.5, 0.5, 0.5,  -0.5,-0.5, 0.5,   0.5,-0.5, 0.5, // v0-v1-v2-v3 front
     0.5, 0.5, 0.5,   0.5,-0.5, 0.5,   0.5,-0.5,-0.5,   0.5, 0.5,-0.5, // v0-v3-v4-v5 right
     0.5, 0.5, 0.5,   0.5, 0.5,-0.5,  -0.5, 0.5,-0.5,  -0.5, 0.5, 0.5, // v0-v5-v6-v1 up
    -0.5, 0.5, 0.5,  -0.5, 0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5,-0.5, 0.5, // v1-v6-v7-v2 left
    -0.5,-0.5,-0.5,   0.5,-0.5,-0.5,   0.5,-0.5, 0.5,  -0.5,-0.5, 0.5, // v7-v4-v3-v2 down
     0.5,-0.5,-0.5,  -0.5,-0.5,-0.5,  -0.5, 0.5,-0.5,   0.5, 0.5,-0.5  // v4-v7-v6-v5 back
  ]);

  /* 
  (1, 1, 1) : white
  (0, 0, 0) : black
  (1, 0, 0) : red
  (0, 1, 0) : blue
  (0, 0, 1) : green
  */
  var colors = new Float32Array([    // Colors
    0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v0-v1-v2-v3 front
    0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v0-v3-v4-v5 right
    0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v0-v5-v6-v1 up
    0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v1-v6-v7-v2 left
    0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v7-v4-v3-v2 down
    0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0    // v4-v7-v6-v5 back
 ]);

  // Normal of Triangle a b c
  // equals the cross product of ab x ac
  // Multiply counterclockwise
  var normals = new Float32Array([    // Normal
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
  ]);


  // Indicies of the vertices
  var indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
 ]);


  // Write the vertex property to buffers (coordinates, colors and normals)
  if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;

  // Write the indices to the buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function initArrayBuffer (gl, attribute, data, num, type) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return true;
}

// Add an obj to the render queue
function pushMatrix(oldMatrix) { 
  var newMatrix = new Matrix4(oldMatrix);
  objectArray.push(newMatrix);
}

// Remove an obj from the render queue
function popMatrix() { 
  return objectArray.pop();
}

function renderSOR(gl, u_MvpMatrix, u_NormalMatrix) {

  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Pass the model matrix to the uniform variable
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  // Set the vertex coordinates, the color and the normal
  var n = initVertexBuffersCube(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Set initial position for the object
  // Moves the object away from the camera so the viewpoint does not clip into the objects
  mvpMatrix.setTranslate(0, 0, -2.8);  

  // Rotate the object based on the key presses and angle returned from keydown
  mvpMatrix.rotate(yAngle, 0, 1, 0); 
  mvpMatrix.rotate(xAngle, 1, 0, 0); 

  // Draw the First Cube
  pushMatrix(mvpMatrix);
  mvpMatrix.scaleAmount
  mvpMatrix.translate(moveAmount[0], moveAmount[1], moveAmount[2]);
  mvpMatrix.rotate(rotation[0], 0, 1, 0); 
  mvpMatrix.rotate(rotation[1], 1, 0, 0);  
  mvpMatrix.rotate(rotation[2], 0, 0, 1);  
  renderObject(gl, u_MvpMatrix, u_NormalMatrix, n);
  mvpMatrix = popMatrix();

  // Draw the Second Cube
  pushMatrix(mvpMatrix);
  mvpMatrix.scaleAmount
  mvpMatrix.translate(2, 0, 0);
  mvpMatrix.translate(moveAmount[0], moveAmount[1], moveAmount[2]);
  mvpMatrix.rotate(rotation[0], 1, 0, 0); 
  mvpMatrix.rotate(rotation[1], 0, 1, 0);  
  mvpMatrix.rotate(rotation[2], 0, 0, 1);  
  renderObject(gl, u_MvpMatrix, u_NormalMatrix, n);
  mvpMatrix = popMatrix();
}

function renderObject(gl, u_MvpMatrix, u_NormalMatrix, n) {
  pushMatrix(mvpMatrix);

  // Pass the model matrix to the uniform variable
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  // Find the normal by doing the inverse of the mvpMatrix
  // Inverse reverses the translations of the previous cube
  // Then do the transpose to convert from row vectors to column vectors
  normalsMatrix.setInverseOf(mvpMatrix);
  normalsMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalsMatrix.elements);

  if (!wireframeToggle) {
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
  }
  else {
    gl.drawElements(gl.LINE_LOOP, n, gl.UNSIGNED_BYTE, 0);
  }

  mvpMatrix = popMatrix();
}

// Allows the user to rotate the objects
// 37 = Left Arrow
// 38 = Down Arrow
// 39 = Right Arrow
// 40 = Up Arrow
function keydown(ev, gl, u_MvpMatrix, u_NormalMatrix,) {
  switch (ev.keyCode) {
    case 40: 
      xAngle += 0.05;
      break;
    case 38: 
      xAngle += 0.05;
      break;
    case 39: 
      yAngle += 0.05;
      break;
    case 37: 
      yAngle += 0.05;
      break;
  }
}

// Listener Function for the Checkbox
// Flips the bool wireframeToggle when the button is clicked
// Re-renders the object with the new state
function switchRender(gl, u_MvpMatrix, u_NormalMatrix) {
  wireframeToggle = wireframeToggle ? false : true;
  console.log(wireframeToggle);
  renderSOR(gl, u_MvpMatrix, u_NormalMatrix);
}