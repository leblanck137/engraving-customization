// Global variables
var uploadedImage = null;
var uploadedImageSize = 0.4;
var uploadedImageX = 0.25;
var uploadedImageWidth;

var moveLeftImageIntervals = [];
var moveRightImageIntervals = [];

// Dragging variables
var isDragging = false;
var dragStartX = 0;
var selectedType = null; // 'text' or 'image'
var selectedIndex = -1;
var draggingCanvas = null; // <--- new

// Initialize the first element of the text arrays
var text = [];
var textSize = [];  // Default size of text
var textX = []; // Default horizontal position of text
var textFont = []; // Default font for text
var textWidth = [];
var textHeight = []; // Height of each text object

// Initialize the first element of the text arrays
var images = [];

var textBoundingBoxes = [];
var imageBoundingBoxes = [];

// Declare variables to store the bound functions outside of the attachEventListeners function
var handleDropbtnClickBound;
var handleDropdownContentClickBound;

var eventListenerMap = {};

var verticalOffsetRatio = 0.05;  // Vertical offset as a fraction of the canvas height

var offscreenCanvas = document.createElement('canvas');
var offscreenCtx = offscreenCanvas.getContext('2d');

var leftBorder = 0.05;
var rightBorder = 0.7;

var moveTimer = { leftSlow: null, leftFast: null, rightSlow: null, rightFast: null };

var textToggleSwitchState = [false];  // The state of the toggle switch for each text field. false = first canvas, true = second canvas. Starts with one value for the first text field.
var imageToggleSwitchState=[false];

// Global variable for moveLeftIntervals and moveRightIntervals
var moveLeftIntervals = [];
var moveRightIntervals = [];
var moveInterval;

var viewportWidth, viewportHeight;

var uploadedImageAspectRatio;
var aspectRatio, secondAspectRatio;

// Define smallCtx and largeCtx at the top level of the script
var smallCtx, largeCtx, secondSmallCtx, secondLargeCtx;

// Variable for storing text field references
var textFields = [];

var textFieldNumbers = [];  // Array to store the nextTextNum for each text field


var rightmostObjectX = leftBorder; // initial position of rightmost object

var fontOffsets = {
    'Helvetica': 0,
    'Arial': 0,
    'Arial Black': 0,
    'Verdana': 0,
    'Tahoma': 0,
    'Trebuchet MS': 0,
    'Impact': 0.05,
    'Gill Sans': 0,
    'Times New Roman': 0,
    'Georgia': 0,
    'Palatino': 0,
    'Baskerville': 0,
    'Courier New': -0.025,
    'Lucida': 0,
    'Monaco': 0.04,
    'Bradley Hand': -0.05,
    'Brush Script MT': -0.03,
    'Luminari': 0,
    'Comic Sans MS': 0
};

function normalizeTouch(event) {
    const t = (event.touches && event.touches[0]) ||
              (event.changedTouches && event.changedTouches[0]);
    return { clientX: t?.clientX || 0, clientY: t?.clientY || 0 };
}


// Function to measure the actual height of text
function measureTextHeight(text, fontSize, font) {
    var previousFillStyle = offscreenCtx.fillStyle;
    offscreenCtx.fillStyle = '#000';
    offscreenCtx.font = fontSize + 'px ' + font;
    offscreenCtx.fillText(text, 0, offscreenCanvas.height);  // Draw the text offscreen
    var data = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height).data;
    var first = offscreenCanvas.height, last = 0;
    for (var row = 0; row < offscreenCanvas.height; row++) {
        for (var col = 0; col < offscreenCanvas.width; col++) {
            if (data[(row * offscreenCanvas.width + col) * 4 + 3]) {
                first = Math.min(row, first);
                last = Math.max(row, last);
            }
        }
    }
    offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);  // Clear the offscreen text
    offscreenCtx.fillStyle = previousFillStyle;
    return last - first;
}


function updateRightmostObjectX(largeCanvas) { 
    var rightmostTextX = leftBorder;
    for (var i = 0; i < text.length; i++) {
        if (!isNaN(textWidth[i])) {
            rightmostTextX = Math.max(rightmostTextX, textX[i] + textWidth[i]);
        }
    }
    if (uploadedImage && !isNaN(uploadedImageAspectRatio)) { // Check that uploadedImageAspectRatio is a number
        var uploadedImageWidth = (uploadedImageSize * largeCanvas.height * uploadedImageAspectRatio) / largeCanvas.width;
        console.log("uploadedImageWidth: ", uploadedImageWidth);
        console.log("uploadedImageX: ", uploadedImageX);
        rightmostObjectX = Math.max(rightmostTextX, uploadedImageX + uploadedImageWidth);
    } else {
        rightmostObjectX = rightmostTextX;
    }
    console.log("Updated rightmostObjectX:", rightmostObjectX);
}



function createFontOption(fontFamily, displayName) {
    var option = document.createElement("option");
    option.value = fontFamily;
    option.style.fontFamily = fontFamily;
    option.textContent = displayName;
    return option;
}


// Add a global event listener to close the dropdown when a click occurs outside of it
document.addEventListener('click', function() {
    // Iterate over all text fields
    textFieldNumbers.forEach(function(thisTextNum) {
        // Get the dropdown content
        var dropdownContent = document.getElementById('text' + thisTextNum + '-container').querySelector('.dropdown-content');

        // If it's open, close it
        if (dropdownContent.classList.contains('show')) {
            dropdownContent.classList.remove('show');
        }
    });
});



window.onload = function() {

// Dragging state variables
let isDragging = false;
let dragStartX = 0;
let selectedType = null; // 'text' or 'image'
let selectedIndex = -1;

    // Get a reference to the small canvas and its 2D rendering context
    var smallCanvas = document.getElementById('product-preview');
    smallCtx = smallCanvas.getContext('2d', { willReadFrequently: true });
    
    // Get a reference to the large canvas and its 2D rendering context
    var largeCanvas = document.getElementById('lightbox-canvas');
    largeCtx = largeCanvas.getContext('2d', { willReadFrequently: true });

    offscreenCanvas.width = largeCanvas.width;
    offscreenCanvas.height = largeCanvas.height;

    // Create a new Image object and set its source to the URL of your product image
    var productImage = new Image();
    productImage.src = 'IMG_8173-min-removebg.png';

    // Get a reference to the second small canvas and its 2D rendering context
    var secondSmallCanvas = document.getElementById('second-product-preview'); // You should create this canvas in your HTML
    var secondSmallCtx = secondSmallCanvas.getContext('2d', { willReadFrequently: true });
    
    // Get a reference to the second large canvas and its 2D rendering context
    var secondLargeCanvas = document.getElementById('second-lightbox-canvas'); // You should create this canvas in your HTML
    var secondLargeCtx = secondLargeCanvas.getContext('2d', { willReadFrequently: true });

    // Create a new Image object and set its source to the URL of the new product image
    var secondProductImage = new Image();
    secondProductImage.src = 'IMG_8173-min-removebg copy 2.png';

    function setCanvasDimensions(smallCanvas, largeCanvas, aspectRatio) {
        // Set the size of the small canvas to match its container
        var container = document.getElementById('canvas-container');
        var desiredCanvasWidth = container.offsetWidth; 
        smallCanvas.width = desiredCanvasWidth;
        smallCanvas.height = desiredCanvasWidth * aspectRatio;
        container.style.height = (smallCanvas.height) + 'px';

        // Set the size of the large canvas to fill the viewport
        var viewportWidth = window.innerWidth;
        var viewportHeight = window.innerHeight;
        largeCanvas.width = viewportWidth;
        largeCanvas.height = viewportWidth * aspectRatio;
        if (largeCanvas.height > viewportHeight) {
            largeCanvas.height = viewportHeight;
            largeCanvas.width = viewportHeight / aspectRatio;
        }
    }

    // When the image finishes loading, draw it onto the canvases
    productImage.onload = function() {
        var aspectRatio = productImage.height / productImage.width;
        setCanvasDimensions(smallCanvas, largeCanvas, aspectRatio);
        drawCanvas();
        updateRightmostObjectX(largeCanvas);
    };

    // When the new image finishes loading, draw it onto the second canvases
    secondProductImage.onload = function() {
        var aspectRatio = secondProductImage.height / secondProductImage.width;
        setCanvasDimensions(secondSmallCanvas, secondLargeCanvas, aspectRatio);
        drawSecondCanvas(); // You should create this function to draw onto the second canvases
    };


    


    // Start the text field numbers from 1
    let currentTextNum = 0;
    let currentImageNum = 0;

    smallCanvas.addEventListener('mousedown', handleMouseDown);
    smallCanvas.addEventListener('mousemove', handleMouseMove);
    smallCanvas.addEventListener('mouseup', handleMouseUp);
    smallCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    smallCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    smallCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    secondSmallCanvas.addEventListener('mousedown', handleMouseDown);
    secondSmallCanvas.addEventListener('mousemove', handleMouseMove);
    secondSmallCanvas.addEventListener('mouseup', handleMouseUp);
    secondSmallCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    secondSmallCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    secondSmallCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    largeCanvas.addEventListener('mousedown', handleMouseDown);
    largeCanvas.addEventListener('mousemove', handleMouseMove);
    largeCanvas.addEventListener('mouseup', handleMouseUp);
    largeCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    largeCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    largeCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    secondLargeCanvas.addEventListener('mousedown', handleMouseDown);
    secondLargeCanvas.addEventListener('mousemove', handleMouseMove);
    secondLargeCanvas.addEventListener('mouseup', handleMouseUp);
    secondLargeCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    secondLargeCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    secondLargeCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    smallCanvas.onclick = function() {
    document.getElementById('lightbox').style.display = 'flex';
    };

	secondSmallCanvas.onclick = function() {
    document.getElementById('lightbox').style.display = 'flex';
    };

	document.getElementById('close-lightbox').onclick = function() {
        document.getElementById('lightbox').style.display = 'none';
    };



let thisTextNum = currentTextNum;
let thisImageNum = currentImageNum;

function addTextField() {
    
    // If there are no text fields, set thisTextNum to 1
    if (textFieldNumbers.length === 0) {
        thisTextNum = 1;
    }
    // Otherwise, find the highest existing text field number and add 1
    else {
        thisTextNum = Math.max(...textFieldNumbers) + 1;
    }
    
    console.log("newTextX: ",newTextX);
    console.log("rightmostObjectX: ",rightmostObjectX);
    var newTextX = rightmostObjectX + 0.05;
    console.log("newTextX: ",newTextX);
    console.log("textX: ",textX);

    // Update the JavaScript arrays
    text.push('');
    textSize.push(0.35);  // Default size of text
    textX.push(newTextX); // Default horizontal position of text, shift for each new field
    textFont.push('Arial'); // Default font for text
    textWidth.push(0);




    
    
    // Create the new HTML elements
var newTextContainer = document.createElement('div');
newTextContainer.classList.add('text-container', 'selectable'); // Add classes
newTextContainer.id = 'text' + thisTextNum + '-container';
newTextContainer.classList.add('slider-container'); // use the same class to maintain styles
newTextContainer.innerHTML = `
    <label class="custom-label">Text #${thisTextNum}</label>
    <!-- New toggle switch -->
    <input type="checkbox" id="text${thisTextNum}-switch" class="toggle-checkbox" />
    <div class="movement-button-set">
        <div class="movement-button-container">
            <button id="text${thisTextNum}-move-left"><</button>
            <button id="text${thisTextNum}-move-right">></button>
        </div>
    </div>
    <label for="text${thisTextNum}">
        Enter Text ${thisTextNum}
    </label>
    <input type="text" id="text${thisTextNum}">
    <div class="container">
        <input id="text${thisTextNum}-size" type="range" min="14" max="120" value="35">
        <label id="text${thisTextNum}-size-label">Font Size: 35</label>
        <div id="text${thisTextNum}-size-buttons" class="size-buttons">
            <button id="text${thisTextNum}-snap-35">Standard Size</button>
            <button id="text${thisTextNum}-snap-40">Max Sharp Engraving</button>
        </div>
<!-- Custom font dropdown -->
<div class="dropdown">
<button class="dropbtn">Select a Font</button>
<div id="text${thisTextNum}-font" class="dropdown-content">
    <a href="#" style="font-family: 'Abril Fatface', cursive;">Abril Fatface</a>
    <a href="#" style="font-family: 'Alegreya', serif;">Alegreya</a>
    <a href="#" style="font-family: 'Alfa Slab One', cursive;">Alfa Slab One</a>
    <a href="#" style="font-family: 'Anton', sans-serif;">Anton</a>
    <a href="#" style="font-family: 'Archivo Black', sans-serif;">Archivo Black</a>
    <a href="#" style="font-family: 'Bebas Neue', cursive;">Bebas Neue</a>
    <a href="#" style="font-family: 'Bentham', serif;">Bentham</a>
    <a href="#" style="font-family: 'Bigelow Rules', cursive;">Bigelow Rules</a>
    <a href="#" style="font-family: 'Bowlby One SC', cursive;">Bowlby One SC</a>
    <a href="#" style="font-family: 'Bungee', cursive;">Bungee</a>
    <a href="#" style="font-family: 'Calistoga', cursive;">Calistoga</a>
    <a href="#" style="font-family: 'Carter One', cursive;">Carter One</a>
    <a href="#" style="font-family: 'Castoro Titling', cursive;">Castoro Titling</a>
    <a href="#" style="font-family: 'Chonburi', cursive;">Chonburi</a>
    <a href="#" style="font-family: 'Cinzel Decorative', cursive;">Cinzel Decorative</a>
    <a href="#" style="font-family: 'Comfortaa', cursive;">Comfortaa</a>
    <a href="#" style="font-family: 'Courgette', cursive;">Courgette</a>
    <a href="#" style="font-family: 'Crimson Text', serif;">Crimson Text</a>
    <a href="#" style="font-family: 'Dancing Script', cursive;">Dancing Script</a>
    <a href="#" style="font-family: 'Fredericka the Great', cursive;">Fredericka the Great</a>
    <a href="#" style="font-family: 'Fugaz One', cursive;">Fugaz One</a>
    <a href="#" style="font-family: 'Germania One', cursive;">Germania One</a>
    <a href="#" style="font-family: 'Henny Penny', cursive;">Henny Penny</a>
    <a href="#" style="font-family: 'IBM Plex Sans', sans-serif;">IBM Plex Sans</a>
    <a href="#" style="font-family: 'Indie Flower', cursive;">Indie Flower</a>
    <a href="#" style="font-family: 'Josefin Sans', sans-serif;">Josefin Sans</a>
    <a href="#" style="font-family: 'Jost', sans-serif;">Jost</a>
    <a href="#" style="font-family: 'Kablammo', cursive;">Kablammo</a>
    <a href="#" style="font-family: 'Koulen', cursive;">Koulen</a>
    <a href="#" style="font-family: 'Lacquer', cursive;">Lacquer</a>
    <a href="#" style="font-family: 'Lato', sans-serif;">Lato</a>
    <a href="#" style="font-family: 'Lilita One', cursive;">Lilita One</a>
    <a href="#" style="font-family: 'Lobster', cursive;">Lobster</a>
    <a href="#" style="font-family: 'Lora', serif;">Lora</a>
    <a href="#" style="font-family: 'Luckiest Guy', cursive;">Luckiest Guy</a>
    <a href="#" style="font-family: 'Macondo', cursive;">Macondo</a>
    <a href="#" style="font-family: 'Macondo Swash Caps', cursive;">Macondo Swash Caps</a>
    <a href="#" style="font-family: 'Marcellus SC', serif;">Marcellus SC</a>
    <a href="#" style="font-family: 'Mate', serif;">Mate</a>
    <a href="#" style="font-family: 'Mate SC', serif;">Mate SC</a>
    <a href="#" style="font-family: 'Monoton', cursive;">Monoton</a>
    <a href="#" style="font-family: 'MonteCarlo', cursive;">MonteCarlo</a>
    <a href="#" style="font-family: 'Montez', cursive;">Montez</a>
    <a href="#" style="font-family: 'Montserrat', sans-serif;">Montserrat</a>
    <a href="#" style="font-family: 'Newsreader', serif;">Newsreader</a>
    <a href="#" style="font-family: 'Odibee Sans', cursive;">Odibee Sans</a>
    <a href="#" style="font-family: 'Open Sans', sans-serif;">Open Sans</a>
    <a href="#" style="font-family: 'Oswald', sans-serif;">Oswald</a>
    <a href="#" style="font-family: 'Pacifico', cursive;">Pacifico</a>
    <a href="#" style="font-family: 'Patrick Hand SC', cursive;">Patrick Hand SC</a>
    <a href="#" style="font-family: 'Permanent Marker', cursive;">Permanent Marker</a>
    <a href="#" style="font-family: 'Pirata One', cursive;">Pirata One</a>
    <a href="#" style="font-family: 'Poppins', sans-serif;">Poppins</a>
    <a href="#" style="font-family: 'Recursive', sans-serif;">Recursive</a>
    <a href="#" style="font-family: 'Righteous', cursive;">Righteous</a>
    <a href="#" style="font-family: 'Roboto', sans-serif;">Roboto</a>
    <a href="#" style="font-family: 'Rock Salt', cursive;">Rock Salt</a>
    <a href="#" style="font-family: 'Rowdies', cursive;">Rowdies</a>
    <a href="#" style="font-family: 'Rubik Mono One', sans-serif;">Rubik Mono One</a>
    <a href="#" style="font-family: 'Russo One', sans-serif;">Russo One</a>
    <a href="#" style="font-family: 'Rye', cursive;">Rye</a>
    <a href="#" style="font-family: 'Sacramento', cursive;">Sacramento</a>
    <a href="#" style="font-family: 'Sedgwick Ave Display', cursive;">Sedgwick Ave Display</a>
    <a href="#" style="font-family: 'Shojumaru', cursive;">Shojumaru</a>
    <a href="#" style="font-family: 'Source Code Pro', monospace;">Source Code Pro</a>
    <a href="#" style="font-family: 'Special Elite', cursive;">Special Elite</a>
    <a href="#" style="font-family: 'Spirax', cursive;">Spirax</a>
    <a href="#" style="font-family: 'Staatliches', cursive;">Staatliches</a>
    <a href="#" style="font-family: 'Stalemate', cursive;">Stalemate</a>
    <a href="#" style="font-family: 'Underdog', cursive;">Underdog</a>
    <a href="#" style="font-family: 'Unica One', cursive;">Unica One</a>
    <a href="#" style="font-family: 'Vina Sans', cursive;">Vina Sans</a>
    <a href="#" style="font-family: 'Vollkorn', serif;">Vollkorn</a>
    <a href="#" style="font-family: 'Wallpoet', cursive;">Wallpoet</a>
    <a href="#" style="font-family: 'Walter Turncoat', cursive;">Walter Turncoat</a>
    <a href="#" style="font-family: 'Zen Dots', cursive;">Zen Dots</a>
  </div>
</div>

        <!-- Delete button -->
        <button id="delete-text${thisTextNum}" class="delete-button">x</button>
    </div>
    
`;


    // Attach event listener to show/hide controls when the text object is selected/deselected
    newTextContainer.addEventListener('click', function () {
        toggleControls('text', thisTextNum);
    });

    // Add the new elements to the DOM
    var textFieldsContainer = document.getElementById('text-fields-container');
    textFieldsContainer.appendChild(newTextContainer);



    textFieldNumbers.push(thisTextNum);  // Add the new text field's number to the array
    
    // Attach event listeners for the new text field
    attachEventListeners(thisTextNum, newTextContainer);

	return newTextContainer; // Return the newly created text container
};




function addImage(callback) {
  // Create a temporary input element to trigger the file selection
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png, image/jpeg';

  // Listen for a file selection
  input.onchange = function(e) {
    var file = e.target.files[0];

    // Check if a file was selected
    if (file) {
      var reader = new FileReader();
      
      // When the file is read, create an image object
      reader.onload = function(readerEvent) {
        var image = new Image();
        
// When the image is loaded, store its properties and draw it
image.onload = function() {
  // Determine the next image number based on the existing images
  var thisImageNum = images.length + 1;

// Additional properties as needed
var imageObject = {
  element: image,
  size: 0.4, // Default size
  x: rightmostObjectX + 0.05, // Default x position
  id: 'image' + thisImageNum, // Unique identifier
  toggleSwitchState: false // Default state for toggle switch
};

// Add the image object to the array of images
images.push(imageObject);


// Create the new HTML elements for the image
var newImageContainer = document.createElement('div');
newImageContainer.classList.add('image-container', 'selectable'); // Add classes
newImageContainer.id = 'image' + thisImageNum + '-container';
newImageContainer.classList.add('slider-container'); // use the same class to maintain styles
newImageContainer.innerHTML = `
    <label class="custom-label">Image #${thisImageNum}</label>
    <!-- New toggle switch -->
    <input type="checkbox" id="image${thisImageNum}-switch" class="toggle-checkbox" />
    <div class="movement-button-set">
        <div class="movement-button-container">
            <button id="image${thisImageNum}-move-left"><</button>
            <button id="image${thisImageNum}-move-right">></button>
        </div>
    </div>
    <label for="image${thisImageNum}-size">Image Size</label>
    <div class="container">
        <input type="range" id="image${thisImageNum}-size" min="20" max="70" value="40">
        <div id="image${thisImageNum}-size-buttons" class="size-buttons">
            <button id="image${thisImageNum}-snap-35">Standard Size</button>
            <button id="image${thisImageNum}-snap-40">Max Sharp Engraving</button>
        </div>
    </div>
    <!-- Delete button -->
    <button id="delete-image${thisImageNum}" class="delete-button">x</button>
`;

          // Add the new elements to the DOM
          var imageFieldsContainer = document.getElementById('image-fields-container');
          imageFieldsContainer.appendChild(newImageContainer);

          // Attach event listeners for the new image field
          attachImageEventListeners(thisImageNum, newImageContainer);
          
              // Attach event listener to show/hide controls when the image object is selected/deselected
    newImageContainer.addEventListener('click', function () {
        toggleControls('image', thisImageNum);
    });

          // Draw the canvases
          drawCanvas();
          drawSecondCanvas();

          // Select the newly added image object
          selectElement(newImageContainer);
          
      	// Call the callback function with the newly created image container
      	if (callback) callback(newImageContainer);
        };

        // Set the image source
        image.src = readerEvent.target.result;
      };

      // Read the file as a Data URL
      reader.readAsDataURL(file);
    }
  };

  // Trigger the file selection dialog
  input.click();
  
}



function attachImageEventListeners(thisImageNum,container) { //END attachImageEventListeners function
    var container = document.getElementById('image' + thisImageNum + '-container');

    // Common function to find the image index
    var findImageIndex = function(id) {
        var thisIdNum = parseInt(id.replace('image', '').replace(/\D+/g, ''));
        return images.findIndex(image => image.id === 'image' + thisIdNum);
    };

    // Size slider input event
    var sizeSliderElement = document.getElementById('image' + thisImageNum + '-size');
    if (sizeSliderElement !== null) {
        sizeSliderElement.oninput = function() {
            var dynamicIndex = findImageIndex(this.id);
            images[dynamicIndex].size = this.value / 100; // Convert the slider value to a fraction
            drawCanvas();
            drawSecondCanvas();
        };
    }

//Select Click listener
console.log('Container element:', container);
container.addEventListener('click', function() {
  console.log('Click event fired for element:', container);
  selectElement(container);
});


// Delete button
var deleteImageButton = document.getElementById('delete-image' + thisImageNum);
if (deleteImageButton) {
    var deleteButtonImageKey = 'deleteButton:' + thisImageNum + ':click';
    // Remove old listener if it exists
    if (eventListenerMap[deleteButtonImageKey]) {
        deleteImageButton.removeEventListener('click', eventListenerMap[deleteButtonImageKey]);
    }
    // Create new bound function and store reference
    var newDeleteButtonImageBoundListener = function(event) {
        var dynamicIndex = findImageIndex(deleteImageButton.id);
        if (event.target.textContent === 'x') {
            event.target.textContent = 'x?';
            event.target.style.backgroundColor = 'red';
            var button = event.target;
            setTimeout(function() {
                button.textContent = 'x';
                button.style.backgroundColor = '';
            }, 5000);
        } else if (dynamicIndex > -1) {
            images.splice(dynamicIndex, 1); // Remove the image from the array
            container.remove(); // Remove the container from the DOM
            drawCanvas();
            drawSecondCanvas();
        }
    };
    deleteImageButton.addEventListener('click', newDeleteButtonImageBoundListener);
    eventListenerMap[deleteButtonImageKey] = newDeleteButtonImageBoundListener; // Store the bound listener
}



    // Toggle Switch for Front/Back of Shaft
    var switchElement = document.getElementById('image' + thisImageNum + '-switch');
    if (switchElement !== null) {
        switchElement.onchange = function(event) {
            var dynamicIndex = findImageIndex(event.target.id);
            console.log("Dynamic Index:", dynamicIndex);
			console.log("Checked State:", event.target.checked);
            images[dynamicIndex].toggleSwitchState = event.target.checked;
            drawCanvas();
            drawSecondCanvas();
        };
    }

    // Image Move Left Button
    var moveLeftButton = document.getElementById('image' + thisImageNum + '-move-left');
    if (moveLeftButton !== null) {
        var moveLeftClickKey = 'moveLeftImageClick:' + thisImageNum + ':click';
        var newMoveLeftClickBoundListener = function(event) {
            var dynamicIndex = findImageIndex(event.target.id);
            images[dynamicIndex].x -= 0.001;
            drawCanvas();
            drawSecondCanvas();
        };
        if (eventListenerMap[moveLeftClickKey]) {
            moveLeftButton.removeEventListener('click', eventListenerMap[moveLeftClickKey]);
        }
        moveLeftButton.addEventListener('click', newMoveLeftClickBoundListener);
        eventListenerMap[moveLeftClickKey] = newMoveLeftClickBoundListener;
    
        // mousedown
        moveLeftButton.addEventListener('mousedown', function(event) {
            var dynamicIndex = findImageIndex(event.target.id);
            moveTimer.leftSlow = setTimeout(function() {
                moveLeftImageIntervals[dynamicIndex] = setInterval(function() {
                    images[dynamicIndex].x -= 0.002;
                    drawCanvas();
                    drawSecondCanvas();
                }, 100);
            }, 200);
    
            moveTimer.leftFast = setTimeout(function() {
                clearInterval(moveLeftImageIntervals[dynamicIndex]);
                moveLeftImageIntervals[dynamicIndex] = setInterval(function() {
                    images[dynamicIndex].x -= 0.004;
                    drawCanvas();
                    drawSecondCanvas();
                }, 100);
            }, 1500);
        });
    
        // mouseup + mouseleave
        ['mouseup', 'mouseleave'].forEach(function(eventType) {
            moveLeftButton.addEventListener(eventType, function(event) {
                var dynamicIndex = findImageIndex(event.target.id);
                clearTimeout(moveTimer.leftSlow);
                clearTimeout(moveTimer.leftFast);
                clearInterval(moveLeftImageIntervals[dynamicIndex]);
            });
        });
    }    

    // Image Move Right Button
    var moveRightButton = document.getElementById('image' + thisImageNum + '-move-right');
    if (moveRightButton !== null) {
        var moveRightClickKey = 'moveRightImageClick:' + thisImageNum + ':click';
        var newMoveRightClickBoundListener = function(event) {
            var dynamicIndex = findImageIndex(event.target.id);
            images[dynamicIndex].x += 0.001;
            drawCanvas();
            drawSecondCanvas();
        };
        if (eventListenerMap[moveRightClickKey]) {
            moveRightButton.removeEventListener('click', eventListenerMap[moveRightClickKey]);
        }
        moveRightButton.addEventListener('click', newMoveRightClickBoundListener);
        eventListenerMap[moveRightClickKey] = newMoveRightClickBoundListener;
    
        // mousedown
        moveRightButton.addEventListener('mousedown', function(event) {
            var dynamicIndex = findImageIndex(event.target.id);
            moveTimer.rightSlow = setTimeout(function() {
                moveRightImageIntervals[dynamicIndex] = setInterval(function() {
                    images[dynamicIndex].x += 0.002;
                    drawCanvas();
                    drawSecondCanvas();
                }, 100);
            }, 200);
    
            moveTimer.rightFast = setTimeout(function() {
                clearInterval(moveRightImageIntervals[dynamicIndex]);
                moveRightImageIntervals[dynamicIndex] = setInterval(function() {
                    images[dynamicIndex].x += 0.004;
                    drawCanvas();
                    drawSecondCanvas();
                }, 100);
            }, 1500);
        });
    
        // mouseup + mouseleave
        ['mouseup', 'mouseleave'].forEach(function(eventType) {
            moveRightButton.addEventListener(eventType, function(event) {
                var dynamicIndex = findImageIndex(event.target.id);
                clearTimeout(moveTimer.rightSlow);
                clearTimeout(moveTimer.rightFast);
                clearInterval(moveRightImageIntervals[dynamicIndex]);
            });
        });
    }    

    // Snap - Regular Button
var snap35Button = document.getElementById('image' + thisImageNum + '-snap-35');
if (snap35Button !== null) {
    snap35Button.onclick = function() {
        var thisIdNum = 'image' + parseInt(this.id.replace('image', '').replace('-snap-35', ''));
        var dynamicIndex = images.findIndex(image => image.id === thisIdNum);
        if (dynamicIndex > -1) {
            images[dynamicIndex].size = 0.35;
            drawCanvas();
            drawSecondCanvas();
        }
    };
}


    // Snap - Max Sharp Engraving Button
var snap40Button = document.getElementById('image' + thisImageNum + '-snap-40');
if (snap40Button !== null) {
    snap40Button.onclick = function() {
        var thisIdNum = 'image' + parseInt(this.id.replace('image', '').replace('-snap-40', ''));
        var dynamicIndex = images.findIndex(image => image.id === thisIdNum);
        if (dynamicIndex > -1) {
            images[dynamicIndex].size = 0.4;
            drawCanvas();
            drawSecondCanvas();
        }
    };
}

    
    // Click event to select the image container
    var selectImageKey = 'selectImage:' + thisImageNum + ':click';
    // Remove old listener if it exists
    if (eventListenerMap[selectImageKey]) {
        container.removeEventListener('click', eventListenerMap[selectImageKey]);
    }
    // Create new bound function and store reference
    var newSelectImageBoundListener = function() {
        selectElement(container);
    };
    container.addEventListener('click', newSelectImageBoundListener);
    eventListenerMap[selectImageKey] = newSelectImageBoundListener; // Store the bound listener
    
} //END attachImageEventListeners function for images




function attachEventListeners(thisTextNum,container) { //BEGIN attachEventListeners function
    console.log('Attaching event listeners for:', 'text' + thisTextNum);

    var container = document.getElementById('text' + thisTextNum + '-container');
    console.log('Attaching event listeners for:', 'text' + thisTextNum);

    // Dropdown button
    var dropbtn = container?.querySelector('.dropbtn');
    if (dropbtn) {
        var dropbtnKey = 'dropbtn:' + thisTextNum + ':click';
        // Remove old listener if it exists
        if (eventListenerMap[dropbtnKey]) {
            dropbtn.removeEventListener('click', eventListenerMap[dropbtnKey]);
        }
        // Create new bound function and store reference
        var newDropbtnBoundListener = handleDropbtnClick.bind(null, thisTextNum);
        dropbtn.addEventListener('click', newDropbtnBoundListener);
        eventListenerMap[dropbtnKey] = newDropbtnBoundListener; // Store the bound listener
    }

    // Dropdown content
    var dropdownContent = container?.querySelector('.dropdown-content');
    if (dropdownContent) {
        var dropdownKey = 'dropdown:' + thisTextNum + ':click';
        // Remove old listener if it exists
        if (eventListenerMap[dropdownKey]) {
            dropdownContent.removeEventListener('click', eventListenerMap[dropdownKey]);
        }
        // Create new bound function and store reference
        var newBoundListener = handleDropdownContentClick.bind(null, thisTextNum);
        dropdownContent.addEventListener('click', newBoundListener);
        eventListenerMap[dropdownKey] = newBoundListener; // Store the bound listener
    }
    
    // Text input event
    var textInputElement = document.getElementById('text' + thisTextNum);
    if (textInputElement !== null) {
        textInputElement.oninput = function() {
            var thisIdNum = parseInt(this.id.replace('text', ''));
            var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);
            text[dynamicIndex] = this.value;
            redrawCanvasAndMeasureText(dynamicIndex);
        };
    }




// Size slider input event
    var sizeSliderElement = document.getElementById('text' + thisTextNum + '-size');
    if (sizeSliderElement !== null) {
        sizeSliderElement.oninput = function() {
            var thisIdNum = parseInt(this.id.replace('text', '').replace('-size', ''));
            var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);
            textSize[dynamicIndex] = this.value / 100;  // Convert the slider value to a fraction
            redrawCanvasAndMeasureText(dynamicIndex);
            var sizeLabelElement = document.getElementById('text' + thisIdNum + '-size-label'); // Replace oldTextNum with thisIdNum
            if (sizeLabelElement !== null) {
                sizeLabelElement.innerText = 'Font Size: ' + this.value;  // Update the label
            }
        };
    }

// Select Click listener
console.log('Container element:', container);
container.addEventListener('click', function() {
  console.log('Click event fired for element:', container);
  selectElement(container);
});



// Delete button
    var deleteButton = document.getElementById('delete-text' + thisTextNum);
    if (deleteButton) {
        var deleteButtonKey = 'deleteButton:' + thisTextNum + ':click';
        // Remove old listener if it exists
        if (eventListenerMap[deleteButtonKey]) {
            deleteButton.removeEventListener('click', eventListenerMap[deleteButtonKey]);
        }
        // Create new bound function and store reference
        var newDeleteButtonBoundListener = handleDeleteButtonClick.bind(null, thisTextNum);
        deleteButton.addEventListener('click', newDeleteButtonBoundListener);
        eventListenerMap[deleteButtonKey] = newDeleteButtonBoundListener; // Store the bound listener
    }

//Toggle Switch for Front/Back of Shaft
var switchElement = document.getElementById('text' + thisTextNum + '-switch');
if (switchElement !== null) {
    var switchKey = 'switch:' + thisTextNum + ':change';
    if (eventListenerMap[switchKey]) {
        switchElement.removeEventListener('change', eventListenerMap[switchKey]);
    }
    var newSwitchBoundListener = function(event) {
        var thisIdNum = parseInt(event.target.id.replace('text', '').replace('-switch', ''));
        var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);
        textToggleSwitchState[dynamicIndex] = event.target.checked;
        drawCanvas();
        drawSecondCanvas();
    };
    switchElement.addEventListener('change', newSwitchBoundListener);
    eventListenerMap[switchKey] = newSwitchBoundListener;
}

//Text Move Left Button
    var moveLeftButton = document.getElementById('text' + thisTextNum + '-move-left');
if (moveLeftButton !== null) {
    // Click Event
    var moveLeftClickKey = 'moveLeftClick:' + thisTextNum + ':click';
    var newMoveLeftClickBoundListener = function(event) {
        var thisIdNum = parseInt(event.target.id.replace('text', '').replace('-move-left', ''));
        var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);
        textX[dynamicIndex] -= 0.001;
        if (textX[dynamicIndex] < leftBorder) textX[dynamicIndex] = leftBorder;
        redrawCanvasAndMeasureText(dynamicIndex);
    };
    if (eventListenerMap[moveLeftClickKey]) {
        moveLeftButton.removeEventListener('click', eventListenerMap[moveLeftClickKey]);
    }
    moveLeftButton.addEventListener('click', newMoveLeftClickBoundListener);
    eventListenerMap[moveLeftClickKey] = newMoveLeftClickBoundListener;

    // Mousedown Event
    var moveLeftMousedownKey = 'moveLeftMousedown:' + thisTextNum + ':mousedown';
    var newMoveLeftMousedownBoundListener = handleMoveLeftButtonMousedown.bind(null, thisTextNum);
    if (eventListenerMap[moveLeftMousedownKey]) {
        moveLeftButton.removeEventListener('mousedown', eventListenerMap[moveLeftMousedownKey]);
    }
    moveLeftButton.addEventListener('mousedown', newMoveLeftMousedownBoundListener);
    eventListenerMap[moveLeftMousedownKey] = newMoveLeftMousedownBoundListener;

    // Mouseup Event
    var moveLeftMouseupKey = 'moveLeftMouseup:' + thisTextNum + ':mouseup';
    var newMoveLeftMouseupBoundListener = handleButtonMouseup.bind(null, thisTextNum);
    if (eventListenerMap[moveLeftMouseupKey]) {
        moveLeftButton.removeEventListener('mouseup', eventListenerMap[moveLeftMouseupKey]);
    }
    moveLeftButton.addEventListener('mouseup', newMoveLeftMouseupBoundListener);
    eventListenerMap[moveLeftMouseupKey] = newMoveLeftMouseupBoundListener;

    // Mouseleave Event
    var moveLeftMouseleaveKey = 'moveLeftMouseleave:' + thisTextNum + ':mouseleave';
    var newMoveLeftMouseleaveBoundListener = handleButtonMouseleave.bind(null, thisTextNum);
    if (eventListenerMap[moveLeftMouseleaveKey]) {
        moveLeftButton.removeEventListener('mouseleave', eventListenerMap[moveLeftMouseleaveKey]);
    }
    moveLeftButton.addEventListener('mouseleave', newMoveLeftMouseleaveBoundListener);
    eventListenerMap[moveLeftMouseleaveKey] = newMoveLeftMouseleaveBoundListener;
}

// Move Right Button
var moveRightButton = document.getElementById('text' + thisTextNum + '-move-right');
if (moveRightButton !== null) {
    // Click Event
    var moveRightClickKey = 'moveRightClick:' + thisTextNum + ':click';
    var newMoveRightClickBoundListener = function(event) {
        var thisIdNum = parseInt(event.target.id.replace('text', '').replace('-move-right', ''));
        var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);
        textX[dynamicIndex] += 0.001;
        if (textX[dynamicIndex] + textWidth[dynamicIndex] > rightBorder) textX[dynamicIndex] = rightBorder - textWidth[dynamicIndex];
        redrawCanvasAndMeasureText(dynamicIndex);
    };
    if (eventListenerMap[moveRightClickKey]) {
        moveRightButton.removeEventListener('click', eventListenerMap[moveRightClickKey]);
    }
    moveRightButton.addEventListener('click', newMoveRightClickBoundListener);
    eventListenerMap[moveRightClickKey] = newMoveRightClickBoundListener;

    // Mousedown Event
    var moveRightMousedownKey = 'moveRightMousedown:' + thisTextNum + ':mousedown';
    var newMoveRightMousedownBoundListener = handleMoveRightButtonMousedown.bind(null, thisTextNum);
    if (eventListenerMap[moveRightMousedownKey]) {
        moveRightButton.removeEventListener('mousedown', eventListenerMap[moveRightMousedownKey]);
    }
    moveRightButton.addEventListener('mousedown', newMoveRightMousedownBoundListener);
    eventListenerMap[moveRightMousedownKey] = newMoveRightMousedownBoundListener;

    // Mouseup Event
    var moveRightMouseupKey = 'moveRightMouseup:' + thisTextNum + ':mouseup';
    var newMoveRightMouseupBoundListener = handleButtonMouseup.bind(null, thisTextNum);
    if (eventListenerMap[moveRightMouseupKey]) {
        moveRightButton.removeEventListener('mouseup', eventListenerMap[moveRightMouseupKey]);
    }
    moveRightButton.addEventListener('mouseup', newMoveRightMouseupBoundListener);
    eventListenerMap[moveRightMouseupKey] = newMoveRightMouseupBoundListener;

    // Mouseleave Event
    var moveRightMouseleaveKey = 'moveRightMouseleave:' + thisTextNum + ':mouseleave';
    var newMoveRightMouseleaveBoundListener = handleButtonMouseleave.bind(null, thisTextNum);
    if (eventListenerMap[moveRightMouseleaveKey]) {
        moveRightButton.removeEventListener('mouseleave', eventListenerMap[moveRightMouseleaveKey]);
    }
    moveRightButton.addEventListener('mouseleave', newMoveRightMouseleaveBoundListener);
    eventListenerMap[moveRightMouseleaveKey] = newMoveRightMouseleaveBoundListener;
}


//Snap - Regular Button
var snap35Button = document.getElementById('text' + thisTextNum + '-snap-35');
if (snap35Button !== null) {
    var snap35Key = 'snap35:' + thisTextNum + ':click';
    if (eventListenerMap[snap35Key]) {
        snap35Button.removeEventListener('click', eventListenerMap[snap35Key]);
    }
    var newSnap35BoundListener = function(event) {
        var thisIdNum = parseInt(event.target.id.replace('text', '').replace('-snap-35', ''));
        var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);
        textSize[dynamicIndex] = 0.35;
        redrawCanvasAndMeasureText(dynamicIndex);
    };
    snap35Button.addEventListener('click', newSnap35BoundListener);
    eventListenerMap[snap35Key] = newSnap35BoundListener;
}

//Snap - Max Sharp Engraving Button
var snap40Button = document.getElementById('text' + thisTextNum + '-snap-40');
if (snap40Button !== null) {
    var snap40Key = 'snap40:' + thisTextNum + ':click';
    if (eventListenerMap[snap40Key]) {
        snap40Button.removeEventListener('click', eventListenerMap[snap40Key]);
    }
    var newSnap40BoundListener = function(event) {
        var thisIdNum = parseInt(event.target.id.replace('text', '').replace('-snap-40', ''));
        var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);
        textSize[dynamicIndex] = 0.4;
        redrawCanvasAndMeasureText(dynamicIndex);
    };
    snap40Button.addEventListener('click', newSnap40BoundListener);
    eventListenerMap[snap40Key] = newSnap40BoundListener;
}

    // Click event to select the text container
    var selectTextKey = 'selectText:' + thisTextNum + ':click';
    // Remove old listener if it exists
    if (eventListenerMap[selectTextKey]) {
        container.removeEventListener('click', eventListenerMap[selectTextKey]);
    }
    // Create new bound function and store reference
    var newSelectTextBoundListener = function() {
        selectElement(container);
    };
    container.addEventListener('click', newSelectTextBoundListener);
    eventListenerMap[selectTextKey] = newSelectTextBoundListener; // Store the bound listener

} //END attachEventListeners function for text







//BEGIN movement button functions
function handleMoveLeftButtonMousedown(thisTextNum,event) {
    console.log("Event object for handleMoveLeftButtonMousedown:", event);
    var thisIdNum = parseInt(event.target.id.replace('text', '').replace('-move-left', ''));
    var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);

    // Start a timer to begin slower continuous movement after a short delay
    moveTimer.leftSlow = setTimeout(function() {
        moveLeftIntervals[dynamicIndex] = setInterval(function() {
            textX[dynamicIndex] -= 0.002;
            if (textX[dynamicIndex] < leftBorder) textX[dynamicIndex] = leftBorder;
            redrawCanvasAndMeasureText(dynamicIndex);
        }, 100);  // Move every 100ms
    }, 200);  // Wait 200ms before starting the slower continuous movement

    // Start a timer to begin faster continuous movement after a longer delay
    moveTimer.leftFast = setTimeout(function() {
        // Stop the slower continuous movement
        clearInterval(moveLeftIntervals[dynamicIndex]);

        // Start the faster continuous movement
        moveLeftIntervals[dynamicIndex] = setInterval(function() {
            textX[dynamicIndex] -= 0.004;
            if (textX[dynamicIndex] < leftBorder) textX[dynamicIndex] = leftBorder;
            redrawCanvasAndMeasureText(dynamicIndex);
        }, 100);  // Move every 100ms
    }, 1500);  // Wait 1500ms before starting the faster continuous movement
}

function handleMoveRightButtonMousedown(thisTextNum,event) {
    console.log("Event object for handleMoveRightButtonMousedown:", event);
    var thisIdNum = parseInt(event.target.id.replace('text', '').replace('-move-right', ''));
    var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);

    // Start a timer to begin slower continuous movement after a short delay
    moveTimer.rightSlow = setTimeout(function() {
        moveRightIntervals[dynamicIndex] = setInterval(function() {
            textX[dynamicIndex] += 0.002;
            if (textX[dynamicIndex] + textWidth[dynamicIndex] > rightBorder) textX[dynamicIndex] = rightBorder - textWidth[dynamicIndex];
            redrawCanvasAndMeasureText(dynamicIndex);
        }, 100);  // Move every 100ms
    }, 200);  // Wait 200ms before starting the slower continuous movement

    // Start a timer to begin faster continuous movement after a longer delay
    moveTimer.rightFast = setTimeout(function() {
        // Stop the slower continuous movement
        clearInterval(moveRightIntervals[dynamicIndex]);

        // Start the faster continuous movement
        moveRightIntervals[dynamicIndex] = setInterval(function() {
            textX[dynamicIndex] += 0.004;
            if (textX[dynamicIndex] + textWidth[dynamicIndex] > rightBorder) textX[dynamicIndex] = rightBorder - textWidth[dynamicIndex];
            redrawCanvasAndMeasureText(dynamicIndex);
        }, 100);  // Move every 100ms
    }, 1500);  // Wait 1500ms before starting the faster continuous movement
}

function handleButtonMouseup(thisTextNum,event) {
    console.log("Event object for handleButtonMouseup:", event);
    var thisIdNum = parseInt(event.target.id.replace('text', '').replace('-move-right', '').replace('-move-left', ''));
    var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);

    // Clear the timers and the interval
    clearTimeout(moveTimer.rightSlow);
    clearTimeout(moveTimer.rightFast);
    clearInterval(moveRightIntervals[dynamicIndex]);
    clearTimeout(moveTimer.leftSlow);
    clearTimeout(moveTimer.leftFast);
    clearInterval(moveLeftIntervals[dynamicIndex]);
}

function handleButtonMouseleave(thisTextNum,event) {
    console.log("Event object for handleButtonMouseleave:", event);
    var thisIdNum = parseInt(event.target.id.replace('text', '').replace('-move-right', '').replace('-move-left', ''));
    var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);

    // Clear the timers and the interval
    clearTimeout(moveTimer.rightSlow);
    clearTimeout(moveTimer.rightFast);
    clearInterval(moveRightIntervals[dynamicIndex]);
    clearTimeout(moveTimer.leftSlow);
    clearTimeout(moveTimer.leftFast);
    clearInterval(moveLeftIntervals[dynamicIndex]);
}
//END movement button functions



//BEGIN dropdown functions
function handleDropbtnClick(thisTextNum, event) {
    event.stopImmediatePropagation();
    var dropbtn = event.target; // Get the clicked button from the event
    var dropdownContent = dropbtn.parentNode.querySelector('.dropdown-content'); // Access .dropdown-content inside the dropdown container

    if (dropdownContent) {
        var rect = dropbtn.getBoundingClientRect();
        var left = window.pageXOffset + rect.left + rect.width / 2;
        dropdownContent.style.left = left + 'px';
        dropdownContent.classList.toggle('show');
    }
}



function handleDropdownContentClick(thisTextNum, event) {
    // Check if the clicked element is an <a> tag inside .dropdown-content
    if (event.target.matches('a')) {
        // Get the font from the clicked element's inner text
        let chosenFont = event.target.innerText;
        // Apply the chosen font to the corresponding text item
        var thisIdNum = thisTextNum;
        var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);
        textFont[dynamicIndex] = chosenFont;
        // Change the dropdown button text to the chosen font
        var dropbtn = document.getElementById('text' + thisIdNum + '-container').querySelector('.dropbtn');
        dropbtn.innerText = chosenFont;
        dropbtn.style.fontFamily = chosenFont;
        // Redraw the canvas
        drawCanvas();
        drawSecondCanvas();
        updateRightmostObjectX(largeCanvas);
        // Prevent the default action
        event.preventDefault();
    }
}
//END dropdown functions




function handleDeleteButtonClick(thisTextNum, event) {
    var thisIdNum = parseInt(event.target.id.replace('delete-text', ''));
    var dynamicIndex = textFieldNumbers.indexOf(thisIdNum);
    if (event.target.textContent === 'x') {
        event.target.textContent = 'x?';
        event.target.style.backgroundColor = 'red';
        var button = event.target;
        setTimeout(function() {
            button.textContent = 'x';
            button.style.backgroundColor = '';
        }, 5000);
    } else {
        text.splice(dynamicIndex, 1);
        textSize.splice(dynamicIndex, 1);
        textX.splice(dynamicIndex, 1);
        textFont.splice(dynamicIndex, 1);
        textWidth.splice(dynamicIndex, 1);
        textFieldNumbers.splice(dynamicIndex, 1);
        textToggleSwitchState.splice(dynamicIndex, 1);
        var containerToRemove = document.getElementById('text' + thisIdNum + '-container');

        document.getElementById('text' + thisIdNum).oninput = null;
        document.getElementById('text' + thisIdNum + '-size').oninput = null;
        document.getElementById('text' + thisIdNum + '-snap-35').onclick = null;
        document.getElementById('text' + thisIdNum + '-snap-40').onclick = null;

        // Get the move left and move right buttons
        var moveLeftButton = document.getElementById('text' + thisIdNum + '-move-left');
        var moveRightButton = document.getElementById('text' + thisIdNum + '-move-right');

        // Remove the mouse down, mouse up, and mouse leave event listeners
        moveLeftButton.removeEventListener('mousedown', handleMoveLeftButtonMousedown);
        moveLeftButton.removeEventListener('mouseup', handleButtonMouseup);
        moveLeftButton.removeEventListener('mouseleave', handleButtonMouseleave);
        moveRightButton.removeEventListener('mousedown', handleMoveRightButtonMousedown);
        moveRightButton.removeEventListener('mouseup', handleButtonMouseup);
        moveRightButton.removeEventListener('mouseleave', handleButtonMouseleave);

        // Remove the container
        containerToRemove.parentNode.removeChild(containerToRemove);
        if (text.length < 6) {
            addButton.classList.remove('disabled');
        } else {
            addButton.classList.add('disabled');
        }

        // Update the IDs and event listeners of the remaining text fields
        updateTextFieldIDs();

        drawCanvas();
        drawSecondCanvas();
    }
}



function redrawCanvasAndMeasureText(dynamicIndex) {
    // Measure the new width of the text
    var fontSize = textSize[dynamicIndex] * smallCanvas.height;
    smallCtx.font = fontSize + 'px ' + textFont[dynamicIndex];
    textWidth[dynamicIndex] = smallCtx.measureText(text[dynamicIndex]).width / smallCanvas.width;

    // Check if the text goes beyond the right border
    if (textX[dynamicIndex] + textWidth[dynamicIndex] > rightBorder) {
        // Adjust the text position so it touches the right border
        textX[dynamicIndex] = rightBorder - textWidth[dynamicIndex];
    }

    // Redraw the canvas
    drawCanvas();
    drawSecondCanvas();
    updateRightmostObjectX(largeCanvas);
}




function updateTextFieldIDs() {
    for (var i = 0; i < text.length; i++) {
        var oldIdNum = textFieldNumbers[i]; // Save the old ID number

        // Unbind old event listeners using the old ID number
        unbindEventListeners(oldIdNum);

        var newIdNum = i + 1; // Compute the new ID number

        // Update the IDs and labels of the remaining text fields to match their new positions in the array
        var container = document.getElementById('text' + oldIdNum + '-container');
        if (container) {
            container.id = 'text' + newIdNum + '-container';
        }
        container.querySelector('label.custom-label').textContent = 'Text #' + newIdNum;
        container.querySelector('label[for="text' + oldIdNum + '"]').textContent = 'Enter Text ' + newIdNum;
        document.getElementById('text' + oldIdNum + '-size').id = 'text' + newIdNum + '-size';
        document.getElementById('text' + oldIdNum).id = 'text' + newIdNum;
        document.getElementById('text' + oldIdNum + '-move-left').id = 'text' + newIdNum + '-move-left';
        document.getElementById('text' + oldIdNum + '-move-right').id = 'text' + newIdNum + '-move-right';
        document.getElementById('delete-text' + oldIdNum).id = 'delete-text' + newIdNum;
        document.getElementById('text' + oldIdNum + '-switch').id = 'text' + newIdNum + '-switch';
        document.getElementById('text' + oldIdNum + '-snap-35').id = 'text' + newIdNum + '-snap-35';
        document.getElementById('text' + oldIdNum + '-snap-40').id = 'text' + newIdNum + '-snap-40';
        document.getElementById('text' + oldIdNum + '-font').id = 'text' + newIdNum + '-font';
        document.getElementById('text' + oldIdNum + '-size-label').id = 'text' + newIdNum + '-size-label';

        // Attach new event listeners using the new ID number
        attachEventListeners(newIdNum);

        // Update the textFieldNumbers array to match the new IDs
        textFieldNumbers[i] = newIdNum;
    }
}

function unbindEventListeners(textNum) {
    // Iterate through the keys related to the given text number
    for (var key in eventListenerMap) {
        if (key.includes(textNum)) {
            var parts = key.split(':'); // Split the key into parts
            var elementId = parts[0] + textNum; // Compute the element ID
            var eventType = parts[2]; // Get the event type from the key

            var element = document.getElementById(elementId); // Get the element
            if (element) {
                // Remove the event listener using the stored reference
                element.removeEventListener(eventType, eventListenerMap[key]);
            }
            delete eventListenerMap[key]; // Remove the key from the map
        }
    }
}



















// Function to redraw the canvases
function drawCanvas() {
    console.log('Drawing first canvas...');
    // Clear the canvases
    smallCtx.clearRect(0, 0, smallCanvas.width, smallCanvas.height);
    largeCtx.clearRect(0, 0, largeCanvas.width, largeCanvas.height);

    // Draw the product image onto the canvases
    smallCtx.drawImage(productImage, 0, 0, smallCanvas.width, smallCanvas.height);
    largeCtx.drawImage(productImage, 0, 0, largeCanvas.width, largeCanvas.height);
    
    secondSmallCtx.drawImage(secondProductImage, 0, 0, secondSmallCanvas.width, secondSmallCanvas.height);
    secondLargeCtx.drawImage(secondProductImage, 0, 0, secondLargeCanvas.width, secondLargeCanvas.height);

	smallCtx.fillStyle = 'black';
    largeCtx.fillStyle = 'black';
    
    
    // Draw each image from the images array
    images.forEach(function(imageObject, imageIndex) {
        if (!imageObject.toggleSwitchState) {
            var img = imageObject.element;
            var imgSize = imageObject.size;
            var imgX = imageObject.x;

            var imageHeight = imgSize * smallCanvas.height;
            var imageWidth = imageHeight * (img.width / img.height);
            var imageY = smallCanvas.height / 2 - imageHeight / 2;

            smallCtx.drawImage(img, smallCanvas.width * imgX, imageY, imageWidth, imageHeight);

            imageHeight = imgSize * largeCanvas.height;
            imageWidth = imageHeight * (img.width / img.height);
            imageY = largeCanvas.height / 2 - imageHeight / 2;

            largeCtx.drawImage(img, largeCanvas.width * imgX, imageY, imageWidth, imageHeight);
            
            // Draw black border around the image
            // smallCtx.strokeStyle = 'black';
			// largeCtx.strokeStyle = 'black';
			// smallCtx.lineWidth = 2; // You can adjust this value
			// largeCtx.lineWidth = 2; // You can adjust this value

			// smallCtx.strokeRect(smallCanvas.width * imgX, imageY, imageWidth, imageHeight);
			// largeCtx.strokeRect(largeCanvas.width * imgX, imageY, imageWidth, imageHeight);
        }
    });
  
  
    
    // Draw the entered text onto the canvases
    for (let i = 0; i < text.length; i++) {
    	if (!textToggleSwitchState[i]) {
        if (document.getElementById('text' + (i+1))) {
            text[i] = document.getElementById('text' + (i+1)).value;
            var fontSize = textSize[i] * smallCanvas.height;
            var textHeightValue = measureTextHeight(text[i], fontSize, textFont[i]); // Calculating text height
        	textHeight[i] = textHeightValue; // Storing it in the global array
        	
            smallCtx.font = fontSize + 'px ' + textFont[i];
            textWidth[i] = smallCtx.measureText(text[i]).width / smallCanvas.width;

            var textHeightValue = measureTextHeight(text[i], fontSize, textFont[i]);
            textHeight[i] = textHeightValue;
            console.log('textHeight: ',textHeight)
            var textOffset = fontOffsets[textFont[i]] || 0;
            var centerY = smallCanvas.height / 2 + textHeightValue / 2 + textOffset * smallCanvas.height;
            console.log('Rendering text for text' + (i+1) + ':', text[i]);
            smallCtx.fillText(text[i], smallCanvas.width * textX[i], centerY);

            fontSize = textSize[i] * largeCanvas.height;
            largeCtx.font = fontSize + 'px ' + textFont[i];
            textHeightValue = measureTextHeight(text[i], fontSize);
            textHeight[i] = textHeightValue;
            console.log('textHeight: ',textHeight)
            textOffset = fontOffsets[textFont[i]] || 0;
            centerY = largeCanvas.height / 2 + textHeightValue / 2 + textOffset * largeCanvas.height;
            largeCtx.fillText(text[i], largeCanvas.width * textX[i], centerY);
        
        
          // Draw black border around the text
            // smallCtx.strokeStyle = 'black';
			// largeCtx.strokeStyle = 'black';
			// smallCtx.lineWidth = 2; // You can adjust this value
			// largeCtx.lineWidth = 2; // You can adjust this value
			
			console.log('textX[i]:',textX[i]);
			console.log('largeCanvas.width * textX[i]:',largeCanvas.width * textX[i]);
			console.log('centerY - textHeightValue / 2 - textOffset * largeCanvas.height:',centerY - textHeightValue / 2 - textOffset * largeCanvas.height);
			console.log('textWidth[i] * largeCanvas.width:',textWidth[i] * largeCanvas.width);
			console.log('textHeightValue:',textHeightValue);
			
			// smallCtx.strokeRect(smallCanvas.width * textX[i], centerY - textHeightValue, textWidth[i] * smallCanvas.width, textHeightValue);
			// largeCtx.strokeRect(largeCanvas.width * textX[i], centerY - textHeightValue, textWidth[i] * largeCanvas.width, textHeightValue);
		}
		}
    }



    // ADDED - Update the rightmost object's X position
    updateRightmostObjectX(largeCanvas);

    // Draw the left border
    largeCtx.lineWidth = 3;
    largeCtx.beginPath();
    largeCtx.moveTo(leftBorder * largeCanvas.width, 0);
    largeCtx.lineTo(leftBorder * largeCanvas.width, largeCanvas.height);
    largeCtx.stroke();

    // Draw the right border
    largeCtx.beginPath();
    largeCtx.moveTo(rightBorder * largeCanvas.width, 0);
    largeCtx.lineTo(rightBorder * largeCanvas.width, largeCanvas.height);
    largeCtx.stroke();
    
    updateRightmostObjectX(largeCanvas); // Call this at the end of drawCanvas

	// Call the function to draw the overlays
    drawOverlays();
} //END drawCanvas





// Function to redraw the canvases
function drawSecondCanvas() {
    console.log('Drawing second canvas...');
    // Clear the canvases
    secondSmallCtx.clearRect(0, 0, secondSmallCanvas.width, secondSmallCanvas.height);
    secondLargeCtx.clearRect(0, 0, secondLargeCanvas.width, secondLargeCanvas.height);

    // Draw the product image onto the canvases
    secondSmallCtx.drawImage(secondProductImage, 0, 0, secondSmallCanvas.width, secondSmallCanvas.height);
    secondLargeCtx.drawImage(secondProductImage, 0, 0, secondLargeCanvas.width, secondLargeCanvas.height);

    secondSmallCtx.fillStyle = 'black';
    secondLargeCtx.fillStyle = 'black';
    
    // Draw each image from the images array
    images.forEach(function(imageObject, imageIndex) {
        if (imageObject.toggleSwitchState) {
            var img = imageObject.element;
            var imgSize = imageObject.size;
            var imgX = imageObject.x;

            var imageHeight = imgSize * secondSmallCanvas.height;
            var imageWidth = imageHeight * (img.width / img.height);
            var imageY = secondSmallCanvas.height / 2 - imageHeight / 2;

            secondSmallCtx.drawImage(img, secondSmallCanvas.width * imgX, imageY, imageWidth, imageHeight);

            imageHeight = imgSize * secondLargeCanvas.height;
            imageWidth = imageHeight * (img.width / img.height);
            imageY = secondLargeCanvas.height / 2 - imageHeight / 2;

            secondLargeCtx.drawImage(img, secondLargeCanvas.width * imgX, imageY, imageWidth, imageHeight);
            
            // Draw black border around the image
            // smallCtx.strokeStyle = 'black';
			// largeCtx.strokeStyle = 'black';
			// smallCtx.lineWidth = 2; // You can adjust this value
			// largeCtx.lineWidth = 2; // You can adjust this value
            
			// secondSmallCtx.strokeRect(secondSmallCanvas.width * imgX, imageY, imageWidth, imageHeight);
			// secondLargeCtx.strokeRect(secondLargeCanvas.width * imgX, imageY, imageWidth, imageHeight);
        }
    });
    
    
    
    
    // Draw the entered text onto the canvases
    for (let i = 0; i < text.length; i++) {
    	if (textToggleSwitchState[i]) {
        if (document.getElementById('text' + (i+1))) {
            text[i] = document.getElementById('text' + (i+1)).value;
            var fontSize = textSize[i] * secondSmallCanvas.height;
            secondSmallCtx.font = fontSize + 'px ' + textFont[i];
            textWidth[i] = secondSmallCtx.measureText(text[i]).width / secondSmallCanvas.width;

            var textHeightValue = measureTextHeight(text[i], fontSize, textFont[i]);
            var textOffset = fontOffsets[textFont[i]] || 0;
            var centerY = secondSmallCanvas.height / 2 + textHeightValue / 2 + textOffset * secondSmallCanvas.height;
            console.log('Rendering text for text' + (i+1) + ':', text[i]);
            secondSmallCtx.fillText(text[i], secondSmallCanvas.width * textX[i], centerY);

            fontSize = textSize[i] * secondLargeCanvas.height;
            secondLargeCtx.font = fontSize + 'px ' + textFont[i];
            textHeightValue = measureTextHeight(text[i], fontSize);
            textOffset = fontOffsets[textFont[i]] || 0;
            centerY = secondLargeCanvas.height / 2 + textHeightValue / 2 + textOffset * secondLargeCanvas.height;
            secondLargeCtx.fillText(text[i], secondLargeCanvas.width * textX[i], centerY);
        }
        	// Draw black border around the text
        	// smallCtx.strokeStyle = 'black';
			// largeCtx.strokeStyle = 'black';
			// smallCtx.lineWidth = 2; // You can adjust this value
			// largeCtx.lineWidth = 2; // You can adjust this value

			// secondSmallCtx.strokeRect(secondSmallCanvas.width * textX[i], centerY - textHeightValue, textWidth[i] * secondSmallCanvas.width, textHeightValue);
			// secondLargeCtx.strokeRect(secondLargeCanvas.width * textX[i], centerY - textHeightValue, textWidth[i] * secondLargeCanvas.width, textHeightValue);
    }
    }


    // ADDED - Update the rightmost object's X position
    updateRightmostObjectX(largeCanvas);

    // Draw the left border
    secondLargeCtx.lineWidth = 3;
    secondLargeCtx.beginPath();
    secondLargeCtx.moveTo(leftBorder * secondLargeCanvas.width, 0);
    secondLargeCtx.lineTo(leftBorder * secondLargeCanvas.width, secondLargeCanvas.height);
    secondLargeCtx.stroke();

    // Draw the right border
    secondLargeCtx.beginPath();
    secondLargeCtx.moveTo(rightBorder * secondLargeCanvas.width, 0);
    secondLargeCtx.lineTo(rightBorder * secondLargeCanvas.width, secondLargeCanvas.height);
    secondLargeCtx.stroke();
    
    updateRightmostObjectX(largeCanvas); // Call this at the end of drawCanvas

	// Call the function to draw the overlays
    drawOverlays();
} //END drawSecondCanvas




function drawOverlays() {
    const canvases = [largeCanvas, secondLargeCanvas];
    canvases.forEach((canvas) => {
        const ctx = canvas.getContext('2d');

        // Calculate the size and position of the rectangles
        const topHeight = canvas.height * 0.125;
        const bottomHeight = canvas.height * 0.25;
        
        // Draw the top red rectangle
        ctx.fillStyle = 'rgba(255, 0, 0, 0.05)'; // red with 10% opacity
        ctx.fillRect(0, 0, canvas.width, topHeight);
        
        // Draw the bottom red rectangle
        ctx.fillStyle = 'rgba(255, 0, 0, 0.05)'; // red with 10% opacity
        ctx.fillRect(0, canvas.height - topHeight, canvas.width, canvas.height);
        
        // Draw the top yellow rectangle
        ctx.fillStyle = 'rgba(255, 255, 0, 0.05)'; // yellow with 10% opacity
        ctx.fillRect(0, topHeight, canvas.width, topHeight);
        
        // Draw the bottom yellow rectangle
        ctx.fillStyle = 'rgba(255, 255, 0, 0.05)'; // yellow with 10% opacity
        ctx.fillRect(0, canvas.height - bottomHeight, canvas.width, topHeight);
    });
}



function createTextControls(textNum) {
  // Create a new container for the text controls
  var container = document.createElement('div');
  container.id = 'text-controls-' + textNum;
  container.style.display = 'none';

  // Add the specific controls for this text object
  // For example:
  var fontSizeSlider = document.createElement('input');
  fontSizeSlider.type = 'range';
  container.appendChild(fontSizeSlider);

  // Add any other controls you need...

  // Append the container to the appropriate parent element
  var parentContainer = document.getElementById('text-fields-container');
  parentContainer.appendChild(container);
}

function toggleControls(type, index) {
    // Hide all controls
    deselectAllElements();

    // Show controls for the selected object
    var selectedContainer = document.getElementById(type + index + '-container');
    selectedContainer.style.display = 'flex';

    // Set the selected indices based on the type
    if (type === 'text') {
        selectedTextIndex = index;
    } else if (type === 'image') {
        selectedImageIndex = index;
    }
}







function selectElement(element) {
    console.log("selecting");

    // Deselect all other elements
    deselectAllElements();

    // Select the given element
    element.classList.add('selected');

    // Handle text-specific logic
    if (element.classList.contains('text-container')) {
        var textNum = parseInt(element.id.replace('text', '').replace('-container', ''));

        var dynamicIndex = textFieldNumbers.indexOf(textNum);
        selectedTextIndex = dynamicIndex;
        selectedImageIndex = -1; // No image selected
        toggleControls('text', textNum); // Toggle the text controls
    }

    // Handle image-specific logic
    if (element.classList.contains('image-container')) {
        var imageNum = parseInt(element.id.replace('image', '').replace('-container', ''));

        var dynamicIndex = images.findIndex(image => image.id === 'image' + imageNum);
        selectedImageIndex = dynamicIndex;
        selectedTextIndex = -1; // No text selected
        toggleControls('image', imageNum); // Toggle the image controls
    }

    // Redraw the canvas to reflect the selection
    drawCanvas();
    drawSecondCanvas();
}

function handleMouseDown(event) {
    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    selectedType = null;
    selectedIndex = -1;

    // Check if clicked on text
    for (let i = 0; i < text.length; i++) {
        const isBackSide = textToggleSwitchState[i];
        const allowedCanvases = isBackSide ? [secondSmallCanvas, secondLargeCanvas] : [smallCanvas, largeCanvas];
        if (!allowedCanvases.includes(canvas)) continue;

        const targetCanvas = canvas; 
        const currentCtx = targetCanvas.getContext('2d');
        const fontSize = textSize[i] * targetCanvas.height;
        currentCtx.font = fontSize + 'px ' + textFont[i];

        const width = currentCtx.measureText(text[i]).width;
        const height = textHeight[i];
        const x = targetCanvas.width * textX[i];
        const y = targetCanvas.height / 2 - height / 2;

        if (
            mouseX >= x &&
            mouseX <= x + width &&
            mouseY >= y &&
            mouseY <= y + height
        ) {
            isDragging = true;
            selectedType = 'text';
            selectedIndex = i;
            dragStartX = mouseX;
            draggingCanvas = canvas; // <--- Lock to this canvas
            return;
        }
    }

    // Check if clicked on image
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const isBackSide = img.toggleSwitchState;
        const allowedCanvases = isBackSide ? [secondSmallCanvas, secondLargeCanvas] : [smallCanvas, largeCanvas];
        if (!allowedCanvases.includes(canvas)) continue;

        const imgHeight = img.size * canvas.height;
        const imgWidth = imgHeight * (img.element.width / img.element.height);
        const imgX = canvas.width * img.x;
        const imgY = canvas.height / 2 - imgHeight / 2;

        if (
            mouseX >= imgX &&
            mouseX <= imgX + imgWidth &&
            mouseY >= imgY &&
            mouseY <= imgY + imgHeight
        ) {
            isDragging = true;
            selectedType = 'image';
            selectedIndex = i;
            dragStartX = mouseX;
            draggingCanvas = canvas; // <--- Lock to this canvas
            return;
        }
    }
}

function handleMouseMove(event) {
    console.log("handleMouseMove fired");
    console.log("isDragging:", isDragging);
    console.log("selectedObject:", selectedObject);
    if (!isDragging) return;
    if (event.target !== draggingCanvas) return; // <--- Only react if dragging on same canvas

    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const dx = mouseX - dragStartX;
    dragStartX = mouseX;

    if (selectedType === 'text' && selectedIndex !== -1) {
        textX[selectedIndex] += dx / canvas.width;
        if (textX[selectedIndex] < leftBorder) textX[selectedIndex] = leftBorder;
        if (textX[selectedIndex] + textWidth[selectedIndex] > rightBorder) {
            textX[selectedIndex] = rightBorder - textWidth[selectedIndex];
        }
        drawCanvas();
        drawSecondCanvas();
    }

    if (selectedType === 'image' && selectedIndex !== -1) {
        images[selectedIndex].x += dx / canvas.width;
        if (images[selectedIndex].x < leftBorder) images[selectedIndex].x = leftBorder;
        if (images[selectedIndex].x > rightBorder) images[selectedIndex].x = rightBorder;
        drawCanvas();
        drawSecondCanvas();
    }
}

function handleMouseUp(event) {
    if (isDragging) {
        var deltaX = (event.clientX - dragStartX) / draggingCanvas.width;
    
        if (selectedType === 'text') {
            textX[selectedIndex] += deltaX;
            dragStartX = event.clientX;
            redrawCanvasAndMeasureText(selectedIndex);
        } else if (selectedType === 'image') {
            images[selectedIndex].x += deltaX;
            dragStartX = event.clientX;
            drawCanvas();
            drawSecondCanvas();
        }
    }
        
    isDragging = false;
    draggingCanvas = null;
}

function handleTouchStart(event) {
    event.preventDefault();
    console.log("Touch event triggered: touchstart");
    const { clientX, clientY } = normalizeTouch(event);
    event.clientX = clientX;
    event.clientY = clientY;
    handleMouseDown(event);
}

function handleTouchMove(event) {
    event.preventDefault();
    console.log("Touch event triggered: touchmove");
    const { clientX, clientY } = normalizeTouch(event);
    event.clientX = clientX;
    event.clientY = clientY;
    event.buttons = 1;
    handleMouseMove(event);
}

function handleTouchEnd(event) {
    event.preventDefault();
    console.log("Touch event triggered: touchend");
    const { clientX, clientY } = normalizeTouch(event);
    event.clientX = clientX;
    event.clientY = clientY;
    handleMouseUp(event);
}


function deselectAllElements() {
    console.log("deselecting");

    // Deselect all text and image containers
    var allContainers = document.querySelectorAll('.text-container, .image-container');
    allContainers.forEach(function(container) {
        container.style.display = 'none'; // Hide the controls
        container.classList.remove('selected');
    });

    // Reset the selected indices
    selectedTextIndex = -1;
    selectedImageIndex = -1;

    // Redraw the canvas to reflect the deselection
    drawCanvas();
    drawSecondCanvas();
}



document.addEventListener('click', function(e) {
console.log("deselect click");
  // List of IDs or classes that should not trigger deselection
  var excludeList = ['#canvas-container', '#second-canvas-container', '#controls-container', '#image-fields-container', '#text-fields-container', '.lightbox-btn'];

  // Check if the clicked target is outside the excluded elements
  var isOutside = excludeList.every(function(selector) {
    return !e.target.closest(selector);
  });

  // If clicked outside, deselect all elements
  if (isOutside) {
    deselectAllElements();
  }
});



// Add an onclick event listener to the add text button
var addTextButton = document.getElementById('add-text');

addTextButton.onclick = function() {
  if (text.length < 6) {
    var newlyAddedTextField = addTextField(); // Capture the returned container
    drawCanvas();
    drawSecondCanvas();
    selectElement(newlyAddedTextField); // Use the variable here

    if (text.length === 6) {
      addTextButton.classList.add('disabled');
    }
  }
};




var canvas = document.getElementById('lightbox-canvas');

let lastShownIndex = -1;
let clickedObjects = [];

// Modify the handleClickOnCanvas function as follows
function handleClickOnCanvas(event) {
  event.stopPropagation(); // Stop the event from propagating up to the document

  // Reset clickedObjects array and lastShownIndex
  clickedObjects = [];
  lastShownIndex = -1;

  var sourceCanvas = event.target; // Use event.target to determine the clicked canvas
  var x = event.clientX - sourceCanvas.getBoundingClientRect().left;
  var y = event.clientY - sourceCanvas.getBoundingClientRect().top;

  console.log('Click coordinates:', x, y);

  // Check text objects
  text.forEach(function(textObj, index) {
    var currentCanvas = textToggleSwitchState[index] ? secondLargeCanvas : largeCanvas;

    if (currentCanvas === sourceCanvas) {
      // Existing condition for clicking on text object
      if (
        x >= currentCanvas.width * textX[index] &&
        x <= currentCanvas.width * (textX[index] + textWidth[index]) &&
        y >= currentCanvas.height / 2 - textHeight[index] / 2 &&
        y <= currentCanvas.height / 2 + textHeight[index] / 2
      ) {
        clickedObjects.push({
          type: 'text',
          index: index
        });
      }
    }
  });

  // Check image objects
  images.forEach(function(imageObj, index) {
    var currentCanvas = imageObj.toggleSwitchState ? secondLargeCanvas : largeCanvas;

    if (currentCanvas === sourceCanvas) {
      var imgHeight = imageObj.size * currentCanvas.height; // Adjusted height
      var imgWidth = imgHeight * (imageObj.element.width / imageObj.element.height);
      var imageX = currentCanvas.width * imageObj.x;
      var imageY = currentCanvas.height / 2 - imgHeight / 2;

      console.log('imageObj.element.width', imageObj.element.width);
      console.log('imageObj.element.height', imageObj.element.height);
      console.log('imgHeight', imgHeight);
      console.log('imgWidth', imgWidth);
      console.log('imageObj.x', imageObj.x);
      console.log('currentCanvas.width', currentCanvas.width);
      console.log('imageX', imageX);
      console.log('imageY', imageY);
      console.log(
        'canvas: x >= ',
        imageX,
        ' && x <= ',
        imageX + imgWidth,
        ' && y >= ',
        imageY,
        ' && y <= ',
        imageY + imgHeight
      );

      if (
        x >= imageX &&
        x <= imageX + imgWidth &&
        y >= imageY &&
        y <= imageY + imgHeight
      ) {
        var container = document.getElementById('image' + (index + 1) + '-container');
        selectElement(container);
        console.log('You did click it.');
        clickedObjects.push({
          type: 'image',
          index: index
        });
      }
    }
  });

  // Show controls for next object in clickedObjects array, if any
  if (clickedObjects.length > 0) {
    lastShownIndex = (lastShownIndex + 1) % clickedObjects.length;
    const nextObject = clickedObjects[lastShownIndex];

    if (nextObject.type === 'text') {
      var container = document.getElementById('text' + (nextObject.index + 1) + '-container');
      selectElement(container);
    } else if (nextObject.type === 'image') {
      var container = document.getElementById('image' + (nextObject.index + 1) + '-container');
      selectElement(container);
    }
  }
}

// Ensure the event listeners are correctly attached
canvas.addEventListener('click', handleClickOnCanvas);
secondLargeCanvas.addEventListener('click', handleClickOnCanvas);













// Add an onclick event listener to the add image button
var addImageButton = document.getElementById('add-image-btn');

addImageButton.onclick = function() {
  if (images.length < 3) {
    addImage(function(newlyAddedImageField) { // Handle the newly created image container
      drawCanvas();
      drawSecondCanvas();
      selectElement(newlyAddedImageField);

      if (images.length === 3) {
        addImageButton.classList.add('disabled');
      }
    });
  }
};




};