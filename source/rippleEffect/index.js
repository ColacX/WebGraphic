const debug = console.log.bind(console);
const error = console.error.bind(console);
const canvas = document.querySelector("canvas");
const gl = canvas.getContext("webgl2");
let lastTime;
const shaders = {};
const programs = {};
const models = {};
const textures = {};
const frameBuffers = {};

const loadImage = url => {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = function() {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      const level = 0;
      const internalFormat = gl.RGBA;
      const srcFormat = gl.RGBA;
      const srcType = gl.UNSIGNED_BYTE;
      gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        srcFormat,
        srcType,
        image
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      resolve(texture);
    };
    image.src = url;
  });
};

function getAttribute(program, key) {
  const v = gl.getAttribLocation(program, key);
  if (v === -1) error(key, v);
  return v;
}

function getUniform(program, key) {
  const v = gl.getUniformLocation(program, key);
  if (v === -1) error(key, v);
  return v;
}

const requestFile = url => {
  return new Promise((resolve, reject) => {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.onreadystatechange = function() {
      if (request.readyState == 4) {
        if (request.status !== 200) {
          reject(request);
        }

        resolve(request.response);
      }
    };
    request.send(null);
  });
};

const loadVertexShader = sourceCode => {
  const shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, sourceCode);
  gl.compileShader(shader);
  return shader;
};

const loadFragmentShader = sourceCode => {
  const shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, sourceCode);
  gl.compileShader(shader);
  return shader;
};

const loadShaderProgram = (vertexSource, fragmentSource) => {
  const vertexShader = loadVertexShader(vertexSource);
  const fragmentShader = loadFragmentShader(fragmentSource);
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    debug("program", gl.getProgramInfoLog(shaderProgram));
    debug("vertex", gl.getShaderInfoLog(vertexShader));
    debug("fragment", gl.getShaderInfoLog(fragmentShader));
  }

  return shaderProgram;
};

const resizeCanvas = () => {
  let displayWidth = canvas.clientWidth;
  let displayHeight = canvas.clientHeight;

  if (canvas.width != displayWidth || canvas.height != displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
};

const updateScene = () => {
  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers.frame);

  {
    gl.useProgram(programs.rendering);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.heightA);
    const heightSampler = getUniform(programs.rendering, "heightSampler");
    gl.uniform1i(heightSampler, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures.background);
    const backgroundSampler = getUniform(
      programs.rendering,
      "backgroundSampler"
    );
    gl.uniform1i(backgroundSampler, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, models.stamp.bufferPosition);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, models.stamp.bufferIndices);

    const vertexPosition = getAttribute(programs.rendering, "vertexPosition");
    gl.enableVertexAttribArray(vertexPosition);
    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);

    gl.drawElements(
      gl.TRIANGLES,
      models.stamp.indicesData.length,
      gl.UNSIGNED_SHORT,
      0
    );
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

const drawScene = () => {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.529, 0.808, 0.922, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.lineWidth(1);

  {
    gl.useProgram(programs.rendering);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures.heightB);
    const heightSampler = getUniform(programs.rendering, "heightSampler");
    gl.uniform1i(heightSampler, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, models.quad.bufferPosition);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, models.quad.bufferIndices);

    const vertexPosition = getAttribute(programs.rendering, "vertexPosition");
    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vertexPosition);

    gl.drawElements(
      gl.TRIANGLES,
      models.quad.indicesData.length,
      gl.UNSIGNED_SHORT,
      0
    );
  }
};

const renderFirst = () => {
  // gl.enable(gl.DEPTH_TEST);
  // gl.enable(gl.CULL_FACE);
  // gl.cullFace(gl.BACK);
  lastTime = Date.now();
  window.requestAnimationFrame(renderFrame);
};

const renderFrame = () => {
  resizeCanvas();
  updateScene();
  drawScene();
  const nowTime = Date.now();
  const elapsedTime = nowTime - lastTime;
  // console.log({ elapsedTime });
  lastTime = nowTime;
  window.requestAnimationFrame(renderFrame);
};

const runAsync = async () => {
  document.addEventListener("click", e => {
    console.log(e.x, e.y, e);
  });

  if (!gl) {
    throw "failed to get gl context. your browser may does support webgl";
  }

  programs.rendering = loadShaderProgram(
    await requestFile("rendering.vert.glsl"),
    await requestFile("rendering.frag.glsl")
  );

  {
    const verticesData = [-1, +1, -1, -1, +1, -1, +1, +1];
    const indicesData = [0, 1, 3, 3, 1, 2];

    const bufferPosition = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferPosition);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(verticesData),
      gl.STATIC_DRAW
    );

    const bufferIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferIndices);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indicesData),
      gl.STATIC_DRAW
    );

    const model = {
      bufferPosition,
      bufferIndices,
      indicesData,
      verticesData
    };
    models.quad = model;
  }

  {
    const verticesData = [-0.0, +0.5, +0.5, -0.5, -0.5, -0.5];
    const indicesData = [0, 2, 1];

    const bufferPosition = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferPosition);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(verticesData),
      gl.STATIC_DRAW
    );

    const bufferIndices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferIndices);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indicesData),
      gl.STATIC_DRAW
    );

    const model = {
      bufferPosition,
      bufferIndices,
      indicesData,
      verticesData
    };
    models.stamp = model;
  }

  {
    const data = [];
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        data.push(255);
        data.push(255);
        data.push(255);
        data.push(255);
      }
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D
    const target = gl.TEXTURE_2D;
    const level = 0;
    const internalformat = gl.RGBA;
    const width = 256;
    const height = 256;
    const border = 0;
    const format = internalformat;
    const type = gl.UNSIGNED_BYTE;
    const pixels = new Uint8Array(data);
    const offset = 0;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      target,
      level,
      internalformat,
      width,
      height,
      border,
      format,
      type,
      pixels,
      offset
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textures.heightA = texture;
  }

  {
    const data = [];
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 256; x++) {
        data.push(0);
        data.push(0);
        data.push(0);
        data.push(255);
      }
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D
    const target = gl.TEXTURE_2D;
    const level = 0;
    const internalformat = gl.RGBA;
    const width = 256;
    const height = 256;
    const border = 0;
    const format = internalformat;
    const type = gl.UNSIGNED_BYTE;
    const pixels = new Uint8Array(data);
    const offset = 0;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      target,
      level,
      internalformat,
      width,
      height,
      border,
      format,
      type,
      pixels,
      offset
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textures.heightB = texture;
  }

  {
    const texture = await loadImage("background.jpg");
    textures.background = texture;
  }

  {
    const frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    const targetTexture = textures.heightB;
    const level = 0;
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      targetTexture,
      level
    );
    frameBuffers.frame = frameBuffer;
  }

  window.requestAnimationFrame(renderFirst);
};

runAsync();
