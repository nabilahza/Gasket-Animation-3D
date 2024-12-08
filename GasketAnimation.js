/*-----------------------------------------------------------------------------------*/
// Variable Declaration
/*-----------------------------------------------------------------------------------*/

// Common variables
var canvas, gl, program;
var posBuffer, colBuffer, texBuffer, vPosition, vColor, vTexCoord;
var modelViewMatrixLoc, projectionMatrixLoc, texCoordLoc;
var modelViewMatrix, projectionMatrix, texture;

// Variables referencing HTML elements
// theta = [x, y, z]
var subdivSlider, iterSlider, rangeValue, iterationValue, startBtn, resetBtn;
var checkTex1, checkTex2, checkTex3, tex1, tex2, tex3, presetColors;
var theta = [0, 0, 0], move = [0, 0, 0];
var subdivNum = 3, iterNum = 1, scaleNum=1;
var iterTemp = 0, animSeq = 0, animFrame = 0, animFlag = false;
var animSpeed = 60, userInitialScale=1;  // Default value
var isColorTransition = false; // Boolean for gradientCheckBox
var enableAnimRotateXY = false; // Boolean for animRotateXYCheckbox
var enableAnimMoveX = false; // Boolean for animMoveXCheckbox
var enableAnimMoveY = false; // Boolean for animMoveYCheckbox
var circularRotate = false; // Boolean for circularRotationCheckbox
var isHitnBounce = false; // Boolean for HitandBounceCheckbox
var deltaX = 0.0 ;// Horizontal movement speed
var deltaY = 0.0 ;// Vertical movement speed 
setDelta(animSpeed); //assign movement speed for Hit and Bounce

// Variables for the 3D Sierpinski gasket
var points = [], colors = [], textures = [];

// Vertices for the 3D Sierpinski gasket (X-axis, Y-axis, Z-axis, W)
// For 3D, you need to set the z-axis to create the perception of depth
var vertices = [
    vec4( 0.0000,  0.0000, -1.0000, 1.0000),
    vec4( 0.0000,  0.9428,  0.3333, 1.0000),
    vec4(-0.8165, -0.4714,  0.3333, 1.0000),
    vec4( 0.8165, -0.4714,  0.3333, 1.0000)
];

// Different colors for a tetrahedron (RGBA)
var baseColors = [
    vec4(1.0, 0.2, 0.4, 1.0),
    vec4(0.0, 0.9, 1.0, 1.0),
    vec4(0.2, 0.2, 0.5, 1.0),
    vec4(0.0, 0.0, 0.0, 1.0)
];

// Define texture coordinates for texture mapping onto a shape or surface
var texCoord =
    [
        vec2(0, 0), // Bottom-left corner of the texture
        vec2(0, 1), // Top-left corner of the texture
        vec2(1, 1), // Top-right corner of the texture
        vec2(1, 0)  // Bottom-right corner of the texture
    ];

/*-----------------------------------------------------------------------------------*/
// WebGL Utilities
/*-----------------------------------------------------------------------------------*/

// Execute the init() function when the web page has fully loaded
window.onload = function init()
{
    // Primitive (geometric shape) initialization
    divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], subdivNum);

    // WebGL setups
    getUIElement();
    configWebGL();
    configureTexture(tex1);
    updateColorBuffer();
    render();
}

// Retrieve all elements from HTML and store in the corresponding variables
function getUIElement()
{
    canvas = document.getElementById("gl-canvas");
    subdivSlider = document.getElementById("subdiv-slider");
    rangeValue = document.getElementById("rangeValue");
    iterSlider = document.getElementById("iter-slider");
    iterationValue= document.getElementById("iterationValue");
    speedSlider= document.getElementById("speed-slider");
    speedValue= document.getElementById("speedValue");
    scaleSlider= document.getElementById("scale-slider");
    scaleValue= document.getElementById("scaleValue");
    checkTex1 = document.getElementById("check-texture-1");
    checkTex2 = document.getElementById("check-texture-2");
    checkTex3 = document.getElementById("check-texture-3");
    tex1 = document.getElementById("texture-1");
    tex2 = document.getElementById("texture-2");
    tex3 = document.getElementById("texture-3");
    presetColors = document.getElementById("preset-colors");
    startBtn = document.getElementById("start-btn");
    resetBtn = document.getElementById("reset-btn");
    const colorPicker = document.getElementById("colorPicker");
    const previewBtn = document.getElementById("preview-btn");


    subdivSlider.onchange = function(event)
    {
        subdivNum = event.target.value;
        rangeValue.textContent = subdivNum; // Update subdivision value
        recompute();
    };

    iterSlider.onchange = function(event)
    {
        iterNum = event.target.value;
        iterationValue.textContent = iterNum; // Update iteration Value
        recompute();
    };

    scaleSlider.oninput = function(event) {
        scaleNum = parseFloat(event.target.value);
        userInitialScale = scaleNum; // Update userInitialScale with the current slider value
        scaleValue.textContent = scaleNum.toFixed(2); // Update scale value
        recompute();
    };

    speedSlider.oninput = function(event) {
        let speed = event.target.value;
        speedValue.textContent = speed;  // Update the displayed speed value
        updateAnimationSpeed(speed); // Update the animation speed with the updated speed value
    };

    // an event handler for the onchange event of html element (checkTex1) for texture 1
    checkTex1.onchange = function()
    {
        if(checkTex1.checked)
        {
            configureTexture(tex1);
            recompute();
        }
    };

    // an event handler for the onchange event of html element (checkTex2) for texture 2
    checkTex2.onchange = function()
    {
        if(checkTex2.checked)
        {
            configureTexture(tex2);
            recompute();
        }
    };

    // an event handler for the onchange event of html element (checkTex3) for texture 3
    checkTex3.onchange = function()
    {
        if(checkTex3.checked)
        {
            configureTexture(tex3);
            recompute();
        }
    };

    //Color picker event listener for change colour of gasket
    const colorPickers = Array.from(document.querySelectorAll(".colorpicker"));
    colorPickers.forEach((cP, i) => {
        cP.addEventListener("input", () => {
            baseColors[i] = hex2rgb(cP.value);
            render();
        });
    });


    // Color picker event listener for change background color of canvas
    const colorPicker1 = document.getElementById("bg-color-picker");
    colorPicker1.addEventListener("input", (event) => {
        const hexColor = event.target.value;
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;

        gl.clearColor(r, g, b, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        // Re-render the scene to reflect the background color change
        render();
    });

    //Gradient Changes for color transition of gasket
    presetColors.onchange = function (event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        // Update all base colors based on the data-color attributes
        baseColors[0] = hexToVec4(selectedOption.dataset.color1);
        baseColors[1] = hexToVec4(selectedOption.dataset.color2);
        baseColors[2] = hexToVec4(selectedOption.dataset.color3);
        baseColors[3] = hexToVec4(selectedOption.dataset.color4);
        // Recompute the tetrahedron with the updated colors
        recompute();
    };

    //monitor the Checkbox and update the Boolean variable based on the checkbox checked or not
    document.getElementById("gradientCheckbox").onchange = function () {
        isColorTransition = this.checked;
    };

    document.getElementById("animRotateXYCheckbox").onchange = function () {
        enableAnimRotateXY = this.checked;
    };
    document.getElementById("animMoveXCheckbox").onchange = function () {
        enableAnimMoveX = this.checked
    };
    document.getElementById("animMoveYCheckbox").onchange = function () {
        enableAnimMoveY = this.checked
    };

    document.getElementById("circularRotationCheckbox").onchange = function () {
        circularRotate = this.checked;
    };
    document.getElementById("HitandBounceCheckbox").onchange = function () {
        isHitnBounce = this.checked;
    };

    //Keydown event listener for start, stop and reset animation
    document.addEventListener("keydown", function(event) {

        if (event.key === "s" || event.key === "S") { //Press "s" or "S" to start and stop
            if (animFlag) {
                stopAnimation();  // Stop if the animation is already running
            } else {
                startAnimation();  // Start if the animation is not running
            }
        }
        else if (event.key === "r" || event.key === "R") {  // Press "R" or "r" to reset
            resetAnimation();  // Call the reset function
        }
    });

    //Window event for resize the window
    window.addEventListener("resize", () => {
        // Get the current size of the canvas
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Calculate the scaling factors for the projection matrix based on canvas size
        const scaleFactor = Math.min(canvasWidth, canvasHeight) / 200;

        //ortho (left,right,bottom,top,near plane,far plane)
        projectionMatrix = ortho(-canvasWidth / 2 * scaleFactor,
                                canvasWidth / 2 * scaleFactor,
                                -canvasHeight / 2 * scaleFactor,
                                 canvasHeight / 2 * scaleFactor,
                                 -1, 1);
        gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

        // Optionally, update the WebGL viewport
        gl.viewport(0, 0, canvasWidth, canvasHeight);

        // Clear and re-render the scene with the new projection
        gl.clear(gl.COLOR_BUFFER_BIT);
        render();
    });

    startBtn.onclick=function(){
        if(animFlag){
            //Stop animation
            stopAnimation();
        }else{
            //Start animation
            startAnimation();
        }
    };

    resetBtn.onclick = function(){
        resetAnimation();
    };

    previewBtn.onclick = previewAnimation; // Attach the previewAnimation function
}

// Configure WebGL Settings
function configWebGL()
{
    // Initialize the WebGL context
    gl = WebGLUtils.setupWebGL(canvas);

    if(!gl)
    {
        alert("WebGL isn't available");
    }

    // Set the viewport and clear the color
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Enable hidden-surface removal
    gl.enable(gl.DEPTH_TEST);

    // Compile the vertex and fragment shaders and link to WebGL
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create buffers and link them to the corresponding attribute variables in vertex and fragment shaders
    // Buffer for positions
    posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Buffer for colors
    colBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // Buffer for textures
    texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(textures), gl.STATIC_DRAW);

    vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    // Get the location of the uniform variables within a compiled shader program
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    texCoordLoc = gl.getUniformLocation(program, "texture");
}

// Render the graphics for viewing
function render()
{
    // Cancel the animation frame before performing any graphic rendering
    if(animFlag)
    {
        animFlag = false;
        window.cancelAnimationFrame(animFrame);
    }

    // Clear the color buffer and the depth buffer before rendering a new frame
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Pass a 4x4 projection matrix from JavaScript to the GPU for use in shader
    // ortho(left, right, bottom, top, near, far)
    projectionMatrix = ortho(-8, 8, -4.5, 4.5, 2, -2);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // Pass a 4x4 model view matrix from JavaScript to the GPU for use in shader
    // Use translation to readjust the position of the primitive (if needed)
    modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, translate(0, -0.2357, 0));

    // Apply the scale dynamically based on scaleNum
    modelViewMatrix = mult(modelViewMatrix, scale(scaleNum, scaleNum, 1));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // Draw the primitive / geometric shape
    gl.drawArrays(gl.TRIANGLES, 0, points.length);
}

// Recompute points and colors, followed by reconfiguring WebGL for rendering
function recompute()
{
    // Reset points and colors for render update
    points = [];
    colors = [];
    textures = [];

    divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], subdivNum);
    configWebGL();
    render();
}

// Function to interpolate between two colors
function lerpColor(color1, color2, t) {
    const r = color1[0] + t * (color2[0] - color1[0]);
    const g = color1[1] + t * (color2[1] - color1[1]);
    const b = color1[2] + t * (color2[2] - color1[2]);
    return vec4(r, g, b, 1.0);
}

//UpdateColorBuffer to incorporate transitions
function updateColorBuffer() {
    const time = performance.now() * 0.001; // Use current time for smooth transitions
    const useGradient = isColorTransition; // see whether the gradient checkbox is checked or uncheckes
    colors = []; // Rebuild the color array
    points.forEach((_, index) => {
        if (useGradient) {
            // Apply gradient transition if enabled
            const colorIndex = Math.floor(index / 4) % baseColors.length;
            colors.push(getColorTransition(time, colorIndex));
        } else {
            // Use static base colors
            colors.push(baseColors[Math.floor(index / 4 )% baseColors.length]);
        }
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
}

// Function to calculate transitioning colors
function getColorTransition(time, index) {
    const color1 = baseColors[index % baseColors.length]; // Get the first color in the preset array
    const color2 = baseColors[(index + 1) % baseColors.length]; // Get the next color in the preset array

    // Use sine to calculate a smooth interpolation factor between 0 and 1
    const t = 0.5 * (Math.sin(time + index) + 1.0); // Normalized between 0 and 1

    return lerpColor(color1, color2, t); // Interpolate between two preset colors
}

// Update the animation frame
function animUpdate()
{
    // Stop the animation frame and return upon completing all sequences
    if(iterTemp == iterNum)
    {
        window.cancelAnimationFrame(animFrame);
        enableUI();
        animFlag = false;
        startBtn.value="Start Animation"
        iterTemp=0;
        return; // break the self-repeating loop
    }
    // Condition 2: If the stop button was clicked, stop the animation immediately
    if (!animFlag) {
        window.cancelAnimationFrame(animFrame); // Cancel ongoing animation frame
        return; // Stop further animation updates
    }

    // Clear the color buffer and the depth buffer before rendering a new frame
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Set the model view matrix for vertex transformation
    // Use translation to readjust the position of the primitive (if needed)
    modelViewMatrix = mat4();
    modelViewMatrix = mult(modelViewMatrix, translate(0, -0.2357, 0));

    // Switch case to handle the ongoing animation sequence
    // The animation is executed sequentially from case 0 to case n
    switch(animSeq)
    {
        case 0: // Animation 1: Rotate to the right (clockwise)
            theta[2] -= 1; // Decrease theta[2] for clockwise rotation

            if (theta[2] <= -180) // Stop rotation at -180 degrees
            {
                theta[2] = -180; // Clamp the angle to -180
                animSeq++;       // Proceed to the next animation sequence
            }

            break;

        case 1: // Animation 2: Rotate to the left (counterclockwise)
            theta[2] += 1; // Increase theta[2] for counterclockwise rotation

            if (theta[2] >= 0) // Stop rotation at 0 degrees
            {
                theta[2] = 0;  // Clamp the angle to 0
                animSeq++;     // Proceed to the next animation sequence
            }

            break;

        case 2: // Animation 3: Gradual scaling up 
            scaleNum += 0.02;

            if(scaleNum >= 4)
            {
                scaleNum = 4;
                animSeq++;
            }

            break;

        case 3: // Animation 4: Gradual scaling down 
            scaleNum -= 0.02;

            // When the scale reaches or goes below user-defined scale
            if (Math.abs(scaleNum - userInitialScale) <= 0.02) {
                scaleNum = userInitialScale; // Clamp to the user's initial scale
                animSeq++; // Move to the next animation sequence
            }
            break;

        case 4: // Animation 5: Diagonal movement (up and right) 

            move[0] += 0.006; // X-axis increment
            move[1] += 0.003;  // Y-axis increment
            if(move[0] >= 2.0 && move[1] >= 1.0) {
                // Change direction to move diagonally downwards
                move[0] -= 0.006; // Reverse X-axis increment
                move[1] -= 0.003; // Reverse Y-axis increment
                animSeq++;
            }
            break;

        case 5: // Animation 6: Diagonal movement (down and left) 

            move[0] -= 0.006; // X-axis decrement
            move[1] -= 0.003;  // Y-axis decrement
            if(move[0] <= -2.0 && move[1] <= -1.0) {
                // Change direction to move diagonally upwards
                move[0] += 0.006; // Reverse X-axis decrement
                move[1] += 0.003; // Reverse Y-axis decrement
                animSeq++;
            }
            break;


        case 6: // Animation 7: Return to its original position (center) 
            move[0] += 0.006; //X-axis increment
            move[1] += 0.003; //Y-axis increment

            if(move[0] >= 0 && move[1] >= 0)
            {
                move[0] = 0;  //Rest X-axis
                move[1] = 0;  //Reset Y-axis
                animSeq++;
            }
            break;

        // Add extra animation
        case 7: // animation 8: Rotate 360 degrees around X and Y axes
            if (enableAnimRotateXY) {
                theta[0] += 1;  // Increment X rotation
                theta[1] += 1;  // Increment Y rotation

                if(theta[0] >= 360 && theta[1] >= 360) {
                    theta[0] = 360;  // Stop rotation around X axis
                    theta[1] = 360;  // Stop rotation around Y axis
                    animSeq++  // Proceed to the next animation
                }
            } else {
                animSeq++; // Skip this animation if not enabled
            }
            break;
        case 8: // animation 9: back to origin position
            if (enableAnimRotateXY) {
                theta[0] -= 1;  // Counter-rotate around X axis
                theta[1] -= 1;  // Counter-rotate around Y axis

                if (theta[0] <= 0 && theta[1] <= 0) {
                    theta[0] = 0;  // Reset X axis rotation
                    theta[1] = 0;  // Reset Y axis rotation
                    animSeq++;     // Move to next animation
                }
            } else {
                animSeq++;
            }
            break;
        case 9: // animation 10: Move Left along X-axis
            if (enableAnimMoveX){
                move[0] -= 0.006;

                if (move[0] <= -2.0) {
                    move[0] = -2.0;
                    animSeq++;
                }
            } else{
                animSeq++
            }
            break;
        case 10:// animation 11: Move back to the origin along X-axis
            if (enableAnimMoveX){
                move[0] += 0.006;

                if (move[0] >= 0) {
                    move[0] = 0;
                    animSeq++;
                }
            } else {
                animSeq++
            }
            break;
        case 11:// animation 12: Move right along X-axis
            if(enableAnimMoveX){
                move[0] += 0.006;

                if (move[0] >= 2.0) {
                    move[0] = 2.0;
                    animSeq++;
                }
            } else{
                animSeq++
            }
            break;
        case 12:// animation 13: Move back to the origin along X-axis
            if(enableAnimMoveX){
                move[0] -= 0.006;

                if (move[0] <= 0) {
                    move[0] = 0;
                    animSeq++;
                }
            } else {
                animSeq++
            }
            break;
        case 13:// animation 14: Move up along Y-axis
            if(enableAnimMoveY){
                move[1] += 0.006;

                if (move[1] >= 1.5) {
                    move[1] = 1.5;
                    animSeq++;
                }
            } else{
                animSeq++
            }
            break;
        case 14:// animation 15: Move down to the origin
            if(enableAnimMoveY){
                move[1] -= 0.006;

                if (move[1] <= 0) {
                    move[1] = 0;
                    animSeq++;
                }
            } else{
                animSeq++
            }
            break;

        case 15:// animation 16: Move down along Y-axis
            if(enableAnimMoveY){
                move[1] -= 0.006;

                if (move[1] <= -1.5) {
                    move[1] = -1.5;
                    animSeq++;
                }
            } else{
                animSeq++
            }
            break;
        case 16:// animation 17:Move up to the origin
            if(enableAnimMoveY){
                move[1] += 0.005;

                if (move[1] >= 0) {
                    move[1] = 0;
                    animSeq++;
                }
            } else{
                animSeq++
            }
            break;
        case 17:// animation 18:circular rotation
            if (circularRotate) {
                theta[1] += animSpeed * 0.003; // Increment angle for dancing rotation
            
                move[0]= Math.sin(theta[1])*0.1;
                move[1]= Math.cos(theta[1])*0.05;

                if(theta[1]>=360){
                    theta[1] =0;
                    move[0] = 0;
                    move[1] = 0;
                    animSeq++;  //will rotate until full 1 rotation of gasket
                }
            }
            else{animSeq++;}
            break;

        case 18: //animation 19: hit and bounce
            if (isHitnBounce) {
                theta[1] += animSpeed * 0.01; // Increment angle for dancing rotation
            
                move[0]+= deltaX ;
                move[1]+= deltaY ;
                if(move[0] <= -0.9 || move[0] >= 0.9)
                    {
                        console.log("hit boundary x direction");
                        deltaX = -deltaX; // Reverse X-direction
                    }
                    
                if(move[1] <= -1.9 || move[1] >= 1.9)
                    {   console.log("hit boundary y direction");
                        deltaY = -deltaY; // Reverse Y-direction
                    }
                move[0]+= deltaX ;
                move[1]+= deltaY ; //need to click stop button to stop the loop
            }
            else{animSeq++;}
            break;

        default: // Reset animation sequence
            animSeq = 0;
            iterTemp++;
            break;
    }

    // Perform vertex transformation
    modelViewMatrix = mult(modelViewMatrix, rotateX(theta[0]));  // X-axis rotation
    modelViewMatrix = mult(modelViewMatrix, rotateY(theta[1]));
    modelViewMatrix = mult(modelViewMatrix, rotateZ(theta[2]));
    modelViewMatrix = mult(modelViewMatrix, scale(scaleNum, scaleNum, 1));
    modelViewMatrix = mult(modelViewMatrix, translate(move[0], move[1], move[2]));

    // Pass the matrix to the GPU for use in shader
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));

    // // Update the color buffer dynamically
    if(isColorTransition){
        updateColorBuffer();
    }

    // Draw the primitive / geometric shape
    gl.drawArrays(gl.TRIANGLES, 0, points.length);


    setTimeout(function() {
        animUpdate();  // Recursively call the function to continue the animation
    }, Math.max(1000 / animSpeed - 20, 1));  // Subtract a fixed value (e.g., 10) to speed up the animation

}

// Disable the UI elements when the animation is ongoing
function disableUI()
{
    subdivSlider.disabled = true;
    iterSlider.disabled = true;
    scaleSlider.disabled= true;
    speedSlider.disable= true;
    presetColors.disabled = true;
    checkTex1.disabled = true;
    checkTex2.disabled = true;
    checkTex3.disabled = true;
}

// Enable the UI elements after the animation is completed
function enableUI()
{
    subdivSlider.disabled = false;
    iterSlider.disabled = false;
    scaleSlider.disabled= false;
    speedSlider.disable= false;
    presetColors.disabled = false;
    checkTex1.disabled = false;
    checkTex2.disabled = false;
    checkTex3.disabled = false;
}

// Reset all necessary variables to their default values
function resetValue()
{
    theta = [0, 0, 0];
    move = [0, 0, 0];
    scaleNum = 1;
    animSeq = 0;
    iterTemp = 0;
}
// Start animation function
function startAnimation() {
    animFlag=true;
    disableUI(); //Disable UI elements
    animUpdate(); //Start animation
    startBtn.value= "Stop Animation"; //Change button text to "Stop"
}
// Stop animation function
function stopAnimation() {
    animFlag=false;
    window.cancelAnimationFrame(animFrame);// stop ongoing animation
    enableUI(); //Re-enable UI elements
    startBtn.value="Start Animation"; //Change button text to "Start"
}

// Preview animation function
function previewAnimation() {
    let previewDuration = 5000; // Duration of preview in milliseconds (5 seconds)
    animFlag = true; // Enable animation flag
    disableUI(); // Disable UI during the preview
    startBtn.disabled = true; // Disable Start button temporarily
    animUpdate(); // Start animation update loop

    // Stop the preview after the specified duration
    setTimeout(() => {
        animFlag = false; // Stop the animation
        enableUI(); // Re-enable UI elements
        resetValue(); // Reset animation state
        render(); // Re-render the scene
        startBtn.disabled = false; // Re-enable Start button
    }, previewDuration);
}

// Function to reset the animation
function resetAnimation() {
    // Stop the animation
    animFlag = false;
    window.cancelAnimationFrame(animFrame); // Stop the ongoing animation

    // Reset animation-related variables to their initial values
    animSeq = 0;
    animFrame = 0;
    iterTemp = 0;
    theta = [0, 0, 0];  // Reset rotation angles
    move = [0, 0, 0];   // Reset movement
    scaleNum = 1;       // Reset scale
    scaleSign = 1;      // Reset scale sign
    iterNum = 1;        // Reset iteration number
    subdivNum = 3;      // Reset subdivision number
    animSpeed = 60;     // Reset animation speed
    
    isColorTransition = false;
    
    enableAnimRotateXY = false;
    enableAnimMoveX = false;
    enableAnimMoveY = false;
    
    circularRotate = false;
    isHitnBounce = false; 
    setDelta(animSpeed);

    // Reset UI control defaults values
    subdivSlider.value = subdivNum;        // Update no of division to original value (3)
    iterSlider.value = iterNum;            // Update no of iteration to original value (1)
    speedSlider.value = animSpeed;         // Update animation speed to original value (60)
    scaleSlider.value = scaleSign;         // Update scaling to original value (1)


    // Update value next to slider
    rangeValue.textContent = subdivNum;
    iterationValue.textContent = iterNum;
    speedValue.textContent = animSpeed;
    scaleValue.textContent = scaleNum;

    // Uncheck the checkbox for circular Rotation
    const colorblend = document.getElementById("gradientCheckbox");
    colorblend.checked = false; // Uncheck the checkbox

    // Uncheck the checkbox for Rotation 360
    const rotationxy = document.getElementById("animRotateXYCheckbox");
    rotationxy.checked = false; // Uncheck the checkbox

    // Uncheck the checkbox for Move x-axis
    const moveX = document.getElementById("animMoveXCheckbox");
    moveX.checked = false; // Uncheck the checkbox
    
    // Uncheck the checkbox for Move y-axis 
    const moveY = document.getElementById("animMoveYCheckbox");
    moveY.checked = false; // Uncheck the checkbox

    // Uncheck the checkbox for circular Rotation
    const circularrotate = document.getElementById("circularRotationCheckbox");
    circularrotate.checked = false; // Uncheck the checkbox
    
    // Uncheck the checkbox for Hit and Bounce
    const hitnbounce = document.getElementById("HitandBounceCheckbox");
    hitnbounce.checked = false; // Uncheck the checkbox



    // Recompute the geometry (reset to initial state)
    recompute();

    // Re-enable UI elements
    enableUI();

    // Change the button text back to "Start Animation"
    startBtn.value = "Start Animation";
}

// Check whether whether a given number value is a power of 2
function isPowerOf2(value)
{
    return (value & (value - 1)) == 0;
}

function updateAnimationSpeed(speed) {
    animSpeed = speed;  // Update speed based on slider value
    setDelta(animSpeed); // the movement of hit and bounce using updated speed
}

//Set the movement speed for x-axis movement and y-axis movement in circular rotation 
function setDelta(animSpeed){
    deltaX = animSpeed * Math.cos(Math.PI / 3) * 0.0004;
    deltaY = animSpeed * Math.sin(Math.PI / 3) * 0.0004;
}

// Configure the texture
function configureTexture(tex)
{
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tex);
    if (isPowerOf2(tex.width) && isPowerOf2(tex.height))
    {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        console.log("Width: " + tex.width + ", Height: " + tex.height + " (yes)");
    }

    else
    {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        console.log("Width: " + tex.width + ", Height: " + tex.height + " (no)");
    }
}

// convert colour picker hex code to vec4
function hex2rgb(hex) {
    let bigint = parseInt(hex.substring(1), 16);
    let R = ((bigint >> 16) & 255) / 255;
    let G = ((bigint >> 8) & 255) / 255;
    let B = (bigint & 255) / 255;
    return vec4(R, G, B, 1.0);
}
function hexToVec4(hex) {
    // Remove the '#' if it exists
    hex = hex.replace("#", "");
    // Parse the r, g, b components
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return vec4(r, g, b, 1.0); // Return as vec4 with alpha set to 1
}


/*-----------------------------------------------------------------------------------*/
// 3D Sierpinski Gasket
/*-----------------------------------------------------------------------------------*/

// Form a triangle
function triangle(a, b, c, color)
{
    colors.push(baseColors[color]);
    points.push(a);
    textures.push(texCoord[0]);
    colors.push(baseColors[color]);
    points.push(b);
    textures.push(texCoord[1]);
    colors.push(baseColors[color]);
    points.push(c);
    textures.push(texCoord[2]);
}

// Form a tetrahedron with different color for each side
function tetra(a, b, c, d)
{
    triangle(a, c, b, 0);
    triangle(a, c, d, 1);
    triangle(a, b, d, 2);
    triangle(b, c, d, 3);
}

// subdivNum a tetrahedron
function divideTetra(a, b, c, d, count)
{
    // Check for end of recursion
    if(count === 0)
    {
        tetra(a, b, c, d);
    }

    // Find midpoints of sides and divide into four smaller tetrahedra
    else
    {
        var ab = mix(a, b, 0.5);
        var ac = mix(a, c, 0.5);
        var ad = mix(a, d, 0.5);
        var bc = mix(b, c, 0.5);
        var bd = mix(b, d, 0.5);
        var cd = mix(c, d, 0.5);
        --count;

        divideTetra(a, ab, ac, ad, count);
        divideTetra(ab, b, bc, bd, count);
        divideTetra(ac, bc, c, cd, count);
        divideTetra(ad, bd, cd, d, count);
    }
}

/*-----------------------------------------------------------------------------------*/
