let audioContext, analyser;
let cubes = [];
let numCubes = 20; // Adjust the number of cubes
let imgTextures = []; // Array to store image textures
let numTextures = 10; // Total number of textures
let selectedTextures = []; // Array to store indices of selected textures
let numSelectedTextures = 5; // Number of selected textures
let isUsingMic = true; // Flag to track whether microphone input is being used
let audioInput; // Variable to store the audio input (microphone or file)
let audioFileSource; // Declare audioFileSource as a global variable

let musicStatusLabel; // Label to display the status of music playback
let stopButton; // Button to stop or pause music playback

function preload() {
  // Generate a list of indices for selected textures
  selectedTextures = generateRandomIndices(numTextures, numSelectedTextures);

  // Load the selected textures
  for (let i = 0; i < numSelectedTextures; i++) {
    imgTextures.push(loadImage('https://raw.githubusercontent.com/digitalaltar/p5js-sandbox/master/textures/texture_' + selectedTextures[i] + '.png')); // Load texture_i.png for each selected texture
  }

  // Shuffle the array of textures
  imgTextures = shuffle(imgTextures);
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();

  // Create UI elements
  let toggleButton = createButton('Switch to Music');
  toggleButton.position(20, 20);
  toggleButton.mousePressed(toggleInputMode);

  musicStatusLabel = createP('Please select a local file'); // Initial status message
  musicStatusLabel.position(20, 80);

  // Start microphone input by default
  startMicrophoneInput();

  // Create cubes with textures
  for (let i = 0; i < numCubes; i++) {
    cubes.push(new Cube(random(-200, 200), random(-200, 200), random(-200, 200), imgTextures[i % numSelectedTextures]));
  }
}

function toggleInputMode() {
  if (!isUsingMic) {
    // Stop music if it's currently playing
    if (audioInput && !audioInput.paused) {
      audioInput.pause();
      musicStatusLabel.html('Music playback stopped'); // Update status message
      if (stopButton) stopButton.remove(); // Remove stop button if it exists
    }
    startMicrophoneInput(); // Restart microphone input
  } else {
    stopMicrophoneInput(); // Stop microphone input
  }

  isUsingMic = !isUsingMic; // Toggle input mode

  if (isUsingMic) {
    this.html('Switch to Music'); // Change button text
  } else {
    // Prompt user to select an audio file
    let fileInput = createFileInput(handleFile);
    fileInput.position(20, 50);
    this.html('Switch to Mic'); // Change button text
  }
}

function startMicrophoneInput() {
  stopAudioFileInput(); // Stop audio file input if it's active

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      micStream = stream;
      let micSource = audioContext.createMediaStreamSource(stream);
      micSource.connect(analyser);
      micInputActive = true;
    })
    .catch(error => console.error('Error capturing audio:', error));
}

function stopMicrophoneInput() {
  if (micStream) {
    micStream.getTracks().forEach(track => {
      track.stop();
      console.log('Microphone input stopped');
    });
    micInputActive = false;
  }
}

function startAudioFilePlayback(audioInput) {
  stopMicrophoneInput(); // Stop microphone input if it's active

  if (audioFileSource) {
    audioFileSource.disconnect();
  }

  audioFileSource = audioContext.createMediaElementSource(audioInput);
  audioFileSource.connect(analyser);
  analyser.connect(audioContext.destination);
  audioInput.play();
}

function handleFile(file) {
  if (file.type === 'audio') {
    audioInput = new Audio(file.data);
    audioInput.addEventListener('loadedmetadata', () => {
      startAudioFileInput(audioInput);
      musicStatusLabel.html('Now playing: ' + file.name); // Update status message
      createStopButton(); // Create stop button when music starts playing
    });
  } else {
    alert('Please select an audio file.');
  }
}

function startAudioFileInput(audioInput) {
  if (audioInput) {
    // Stop microphone input if active
    stopMicrophoneInput();
    
    // Disconnect previous audio source if any
    if (audioFileSource) {
      audioFileSource.disconnect();
    }

    // Create new audio source from the file input
    audioFileSource = audioContext.createMediaElementSource(audioInput);
    audioFileSource.connect(analyser);
    audioFileSource.connect(audioContext.destination); // Connect audio file source to the destination directly
    audioInput.play();
  }
}

function stopAudioFileInput() {
  if (audioInput) {
    // Pause and reset playback
    audioInput.pause();
    audioInput.currentTime = 0;
    
    // Disconnect audio source from the analyzer and destination
    if (audioFileSource) {
      audioFileSource.disconnect();
    }
  }
}

function createStopButton() {
  stopButton = createButton('Stop'); // Stop button
  stopButton.position(20, 110);
  stopButton.mousePressed(toggleMusic); // Change to toggleMusic function
}

function toggleMusic() {
  if (audioInput.paused) {
    audioInput.play(); // Play music if paused
    stopButton.html('Stop'); // Change button text to "Stop"
  } else {
    audioInput.pause(); // Pause music if playing
    stopButton.html('Play'); // Change button text to "Play"
  }
}

function generateRandomIndices(total, count) {
  // Generate an array containing indices 0 to total - 1
  let indices = Array.from({length: total}, (_, i) => i);

  // Shuffle the array of indices
  indices = shuffle(indices);

  // Return the first 'count' shuffled indices
  return indices.slice(0, count);
}

function stopMusic() {
  if (audioInput) {
    audioInput.pause(); // Pause music playback
    audioInput.currentTime = 0; // Reset playback position to start
    musicStatusLabel.html('Music playback stopped'); // Update status message
  }
}

function draw() {
  background(0);
  orbitControl();

  let spectrum = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(spectrum);

  for (let i = 0; i < numCubes; i++) {
    let cube = cubes[i];
    cube.update(spectrum);
    cube.display();
  }
}

class Cube {
  constructor(x, y, z, imgTexture) {
    this.position = createVector(x, y, z);
    this.size = random(50, 100); // Adjust the size range of cubes
    this.rotationSpeed = random(0.01, 0.05);
    this.imgTexture = imgTexture; // Assign image texture to the cube
  }

  update(spectrum) {
    let index = floor(map(this.position.x + width / 2, 0, width, 0, spectrum.length));
    let amp = spectrum[index];
    let scaleFactor = map(amp, 0, 255, 1, 2);
    this.size = scaleFactor * 100; // Adjust the maximum size of cubes
    this.rotationSpeed = map(amp, 0, 255, 0.01, 0.05);
  }

  display() {
    push();
    translate(this.position.x, this.position.y, this.position.z);
    rotateX(frameCount * this.rotationSpeed);
    rotateY(frameCount * this.rotationSpeed);
    rotateZ(frameCount * this.rotationSpeed);
    texture(this.imgTexture); // Apply the image texture
    box(this.size);
    pop();
  }
}
