// LightedCube.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = 
  'attribute vec4 a_Position;\n' + 
  'attribute vec4 a_Color;\n' + 
  'attribute vec4 a_Normal;\n' +        
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +    // Model matrix
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform vec3 u_LightColor;\n' +     
  'uniform vec3 u_LightPosition;\n' + 
  'uniform vec3 u_AmbientLight;\n' +  // Ambient light color
  'varying vec4 v_Color;\n' +
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_Position;\n' +
  'void main() {\n' +
  '  gl_Position = u_ViewMatrix * u_MvpMatrix * a_Position ;\n' +
  // Calculate the vertex position in the world coordinate
  '  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  // Make the length of the normal 1.0
  '  vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);\n' +
  // Dot product of the light direction and the orientation of a surface (the normal) 
  '  float nDotL = max(dot(u_LightPosition, normal), 0.0);\n' +
  // Calculate the color due to diffuse reflection  
  // $I_d = L_dK_d \hat{L}\cdot\hat{N}
  '  vec3 diffuse = u_LightColor * a_Color.rgb * nDotL;\n' +
  // Calculate the color due to ambient reflection
  '  vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +
  // Calculate the color due to specular reflection
  //'  vec3 specular = 2 * normal * nDotL - u_LightPosition;\n'
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

  var VSHADER_SOURCE1 =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' + // Defined constant in main()
  'attribute vec4 a_Normal;\n' +
  'uniform mat4 u_MvpMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +    // Model matrix
  'uniform mat4 u_NormalMatrix;\n' +   // Transformation matrix of the normal
  'uniform mat4 u_ViewMatrix;\n' +
  'varying vec4 v_Color;\n' +
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_Position;\n' +
  'void main() {\n' +
  '  gl_Position = u_MvpMatrix * a_Position;\n' +
     // Calculate the vertex position in the world coordinate
  '  v_Position = vec3(u_ModelMatrix * a_Position);\n' +
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  '  v_Color = color;\n' + 
  '}\n';

// Fragment shader program
var FSHADER_SOURCE1 =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +
  'uniform vec3 u_LightColor;\n' +     // Light color
  'uniform vec3 u_LightPosition;\n' +  // Position of the light source
  'uniform vec3 u_AmbientLight;\n' +   // Ambient light color
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_Position;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
     // Normalize the normal because it is interpolated and not 1.0 in length any more
  '  vec3 normal = normalize(v_Normal);\n' +
     // Dot product of the light direction and the orientation of a surface (the normal) 
  '  float nDotL = max(dot(u_LightPosition, normal), 0.0);\n' +
     // Calculate the final color from diffuse reflection and ambient reflection
  '  vec3 diffuse = u_LightColor * v_Color.rgb * nDotL;\n' +
  '  vec3 ambient = u_AmbientLight * v_Color.rgb;\n' +
  '  gl_FragColor = vec4(diffuse + ambient, v_Color.a);\n' +
  '}\n';


var mvpMatrix = new Matrix4(); // Model Matrix
var mvpMatrix = new Matrix4(); // Model view projection matrix
var viewMatrix = new Matrix4();  // View/Eye matrix
var normalsMatrix = new Matrix4();  // Transformation matrix for normals
var objectArray = []; // Temp storage for the mvpMatrix that is ready to be rendered

// Code used from Marcus Williamson to help with the translations
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
var toggleDiffused = false; 
var toggleSpecular = false;
var toggleDir = true;
var togglePoint = false;


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

  // Get the storage locations of uniform attributes and so on
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
  var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
  if (!u_MvpMatrix || !u_ViewMatrix || !u_NormalMatrix || !u_LightColor || !u_LightPosition || !u_AmbientLight) { 
    console.log('Failed to get the storage Location');
    return;
  }

  /*
  // Get the storage locations of uniform variables
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  var u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
  var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
  if (!u_ModelMatrix || !u_MvpMatrix || !u_NormalMatrix || !u_LightColor || !u_LightPosition　|| !u_AmbientLight) { 
    console.log('Failed to get the storage location');
    return;
  }
  */

  // Set the light color (white)
  //gl.uniform3f(u_LightColor, 0.8, 0.8, 0.8);
  // Set the light direction (in the world coordinate)
  //gl.uniform3f(u_LightPosition, 1, 1, 1);
  // Set the ambient light
  gl.uniform3f(u_AmbientLight, 0.2, 0.2, 0.2);
  
  
  // Calculate the view projection matrix
  viewMatrix.setLookAt(0, 0, 10, 0, 0, 0, 0, 1, 0);
  viewMatrix.setPerspective(100, canvas.width/canvas.height, 1, 100);
  // Pass the model and view projection matrixes to the variables u_ViewMatrix and u_MvpMatrix
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  


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
    if (!toggleDir && !togglePoint) {
      gl.uniform3f(u_AmbientLight, 0.2, 0.2, 0.2);
    }
    else if (!toggleAmbient) {
      (u_AmbientLight, 0.0, 0.0, 0.0)
    }
    else{gl.uniform3f(u_AmbientLight, 0.2, 0.2, 0.2);}
    
    initCube(gl, u_MvpMatrix, u_NormalMatrix);
  });

  var checkbox = document.getElementById('toggleDiffused');
  checkbox.addEventListener('click', function(){
    toggleDiffused = toggleDiffused ? false : true;
    if (!toggleDiffused) {
      gl.uniform3f(u_LightColor, 0, 0, 0);
    }
    else{
      // Set the light color (white)
      gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
      // Set the light direction (in the world coordinate)
      gl.uniform3f(u_LightPosition, 1, 1, 1);
      }
    initCube(gl, u_MvpMatrix, u_NormalMatrix);
  });

  var checkbox = document.getElementById('toggleSpecular');
  checkbox.addEventListener('click', function(){
    toggleSpecular = toggleSpecular ? false : true;
    if (!toggleSpecular && !toggleDiffused) {
      gl.uniform3f(u_LightColor, 0, 0, 0);
    }
   
    else{
      // Set the light color (white)
      gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
      // Set the light direction (in the world coordinate)
      gl.uniform3f(u_LightPosition, 1, 1, 1);
      }
    initCube(gl, u_MvpMatrix, u_NormalMatrix);
  });

  var checkbox = document.getElementById('toggleDir');
  checkbox.addEventListener('click', function(){
    toggleDir = toggleDir ? false : true;
    if (!toggleDir) {
      gl.uniform3f(u_LightColor, 0, 0, 0);
    }
    else{
      // Set the light color (white)
      gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
      // Set the light direction (in the world coordinate)
      gl.uniform3f(u_LightPosition, 1, 1, 1);
      }
    initCube(gl, u_MvpMatrix, u_NormalMatrix);
  });

  var checkbox = document.getElementById('togglePoint');
  checkbox.addEventListener('click', function(){
    togglePoint = togglePoint ? false : true;
    if (!togglePoint) {
      gl.uniform3f(u_LightColor, 0, 0, 0);
    }
    else{
    // Set the light color (white)
    gl.uniform3f(u_LightColor, 1.0, 0.5, 0.5);
    // Set the light direction (in the world coordinate)
    gl.uniform3f(u_LightPosition, -100, 100, 100);
    }
    initCube(gl, u_MvpMatrix, u_NormalMatrix);
  });


  // Listener for when an arrow key is pressed
  document.onkeydown = function(ev){
    keydown(ev, gl, u_MvpMatrix, u_NormalMatrix);
  };


  document.getElementById("moveX").addEventListener("input", function() {
    moveAmount[0] = this.value / (100 / maxMove[0]);
    console.log(moveAmount[0]);
    initCube(gl, u_MvpMatrix, u_NormalMatrix);
  });

  document.getElementById("moveY").addEventListener("input", function() {
    moveAmount[1] = this.value / (100 / maxMove[1]);
    console.log(moveAmount[1]);
    initCube(gl, u_MvpMatrix, u_NormalMatrix);
  });

  document.getElementById("moveZ").addEventListener("input", function() {
    moveAmount[2] = this.value / (100 / maxMove[2]);
    console.log( moveAmount[2]);
    initCube(gl, u_MvpMatrix, u_NormalMatrix);
  });

  document.getElementById("rotationX").addEventListener("input", function() {
    rotation[0] = this.value;
    console.log(rotation[0]);
    initCube(gl, u_MvpMatrix, u_NormalMatrix);
  });

  document.getElementById("rotationY").addEventListener("input", function() {
    rotation[1] = this.value;
    console.log(rotation[1]);
    initCube(gl, u_MvpMatrix, u_NormalMatrix);
  });

  document.getElementById("rotationZ").addEventListener("input", function() {
    rotation[2] = this.value;
    console.log(rotation[2]);
    initCube(gl, u_MvpMatrix, u_NormalMatrix);
  });

  // Draw the scene repeatedly
  // Loops so it will continously draw the object
  // Updates positon if arrow keys are pressed
  // Checks if the scene should be rendered in Wireframe or Flat Shadding
  
  function render(now) {
    initCube(gl, u_MvpMatrix, u_NormalMatrix);
  
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
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





// ---------------------------------------------------------------
//                           Cube 
// ---------------------------------------------------------------

// Listener Function for the Checkbox
// Flips the bool wireframeToggle when the button is clicked
// Re-renders the object with the new state
function switchRender(gl, u_MvpMatrix, u_NormalMatrix) {
  wireframeToggle = wireframeToggle ? false : true;
  console.log(wireframeToggle);
  initCube(gl, u_MvpMatrix, u_NormalMatrix);
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
  (0, 1, 0) : green
  (0, 0, 1) : blue
  */
  var colors = new Float32Array([    // Colors
    1, 1, 1,   1, 1, 1,   1, 1, 1,  1, 1, 1,     // v0-v1-v2-v3 front
    1, 1, 1,   1, 1, 1,   1, 1, 1,  1, 1, 1,     // v0-v3-v4-v5 right
    1, 1, 1,   1, 1, 1,   1, 1, 1,  1, 1, 1,     // v0-v5-v6-v1 up
    1, 1, 1,   1, 1, 1,   1, 1, 1,  1, 1, 1,     // v1-v6-v7-v2 left
    1, 1, 1,   1, 1, 1,   1, 1, 1,  1, 1, 1,     // v7-v4-v3-v2 down
    1, 1, 1,   1, 1, 1,   1, 1, 1,  1, 1, 1    // v4-v7-v6-v5 back
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

    
  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

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


function initCube(gl, u_MvpMatrix, u_NormalMatrix) {
  // Pass the model and view projection matrixes to the variables u_MvpMatrix
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements)



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

  // Draw the First Cube
  pushMatrix(mvpMatrix);
  mvpMatrix.translate(2, 0, 0);
  mvpMatrix.translate(moveAmount[0], moveAmount[1], moveAmount[2]);
  mvpMatrix.rotate(rotation[0], 0, 1, 0); 
  mvpMatrix.rotate(rotation[1], 1, 0, 0);  
  mvpMatrix.rotate(rotation[2], 0, 0, 1);  
  renderCube(gl, u_MvpMatrix, u_NormalMatrix, n);
  mvpMatrix = popMatrix();

  // Draw the Second Cube
  pushMatrix(mvpMatrix);
  mvpMatrix.scaleAmount
  //mvpMatrix.translate(-1, 0, 0);
  mvpMatrix.translate(moveAmount[0], moveAmount[1], moveAmount[2]);
  mvpMatrix.rotate(rotation[0], 1, 0, 0); 
  mvpMatrix.rotate(rotation[1], 0, 1, 0);  
  mvpMatrix.rotate(rotation[2], 0, 0, 1);  
  renderCube(gl, u_MvpMatrix, u_NormalMatrix, n);
  mvpMatrix = popMatrix();

  // Set the vertex coordinates, the color and the normal
  var n = initVertexBuffersSphere(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }
  //renderSphere(gl, u_MvpMatrix, u_NormalMatrix, n);
}

function renderCube(gl, u_MvpMatrix, u_NormalMatrix, n) {
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



// ---------------------------------------------------------------
//                           Sphere 
// ---------------------------------------------------------------

function initVertexBuffersSphere(gl) { // Create a sphere
  var SPHERE_DIV = 13;

  var i, ai, si, ci;
  var j, aj, sj, cj;
  var p1, p2;

  var positions = [];
  var indices = [];

  // Generate coordinates
  for (j = 0; j <= SPHERE_DIV; j++) {
    aj = j * Math.PI / SPHERE_DIV;
    sj = Math.sin(aj);
    cj = Math.cos(aj);
    for (i = 0; i <= SPHERE_DIV; i++) {
      ai = i * 2 * Math.PI / SPHERE_DIV;
      si = Math.sin(ai);
      ci = Math.cos(ai);

      positions.push(si * sj);  // X
      positions.push(cj);       // Y
      positions.push(ci * sj);  // Z
    }
  }

  // Generate indices
  for (j = 0; j < SPHERE_DIV; j++) {
    for (i = 0; i < SPHERE_DIV; i++) {
      p1 = j * (SPHERE_DIV+1) + i;
      p2 = p1 + (SPHERE_DIV+1);

      indices.push(p1);
      indices.push(p2);
      indices.push(p1 + 1);

      indices.push(p1 + 1);
      indices.push(p2);
      indices.push(p2 + 1);
    }
  }

  // Write the vertex property to buffers (coordinates and normals)
  // Same data can be used for vertex and normal
  // In order to make it intelligible, another buffer is prepared separately
  if (!initArrayBuffer(gl, 'a_Position', new Float32Array(positions), gl.FLOAT, 3)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', new Float32Array(positions), gl.FLOAT, 3))  return -1;
  
  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Write the indices to the buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return indices.length;
}

function initSphere() {
   // Pass the model and view projection matrixes to the variables u_MvpMatrix
   gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements)



   // Clear color and depth buffer
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
 
   // Pass the model matrix to the uniform variable
   gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);
 
   // Set the vertex coordinates, the color and the normal
   var n = initVertexBuffersSphere(gl);
   if (n < 0) {
     console.log('Failed to set the vertex information');
     return;
   }

  // Set initial position for the object
  // Moves the object away from the camera so the viewpoint does not clip into the objects
  mvpMatrix.setTranslate(0, 0, -2.8);  

  // Draw the First Sphere
  pushMatrix(mvpMatrix);
  renderSphere(gl, u_MvpMatrix, u_NormalMatrix, n);
}


function renderSphere(gl, u_MvpMatrix, u_NormalMatrix, n) {
  pushMatrix(mvpMatrix);

  // Pass the model view projection matrix to u_MvpMatrix
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

  // Calculate the matrix to transform the normal based on the model matrix
  normalMatrix.setInverseOf(modelMatrix);
  normalMatrix.transpose();
  // Pass the transformation matrix for normals to u_NormalMatrix
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Draw the cube(Note that the 3rd argument is the gl.UNSIGNED_SHORT)
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);
 
  mvpMatrix = popMatrix();
}