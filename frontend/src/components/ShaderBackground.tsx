"use client";

import { useEffect, useRef } from "react";

// Ported 1:1 from design-reference/shader/code.html — the animated
// node-and-connection background used behind the login glass card.
const VERTEX_SHADER = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
varying vec2 v_texCoord;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec2 get_node_pos(vec2 id, float time) {
    float h = hash(id);
    return vec2(
        sin(time * 0.3 + h * 6.28),
        cos(time * 0.4 + h * 6.28)
    ) * 0.3 + 0.5;
}

void main() {
    vec2 uv = v_texCoord;
    vec3 backgroundColor = vec3(0.98, 0.98, 0.97); // #FAFAF8
    vec3 indigo = vec3(0.26, 0.22, 0.79); // #4338CA

    vec3 color = backgroundColor;
    float time = u_time * 0.5;

    vec2 grid = uv * 6.0;
    vec2 id = floor(grid);
    vec2 f = fract(grid);

    for(int y=-1; y<=1; y++) {
        for(int x=-1; x<=1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 node_id = id + neighbor;
            vec2 node_pos = get_node_pos(node_id, time);

            float d = length(f - neighbor - node_pos);
            color = mix(color, indigo, smoothstep(0.02, 0.0, d) * 0.4);

            for(int ny=0; ny<=1; ny++) {
                for(int nx=0; nx<=1; nx++) {
                    if(nx == 0 && ny == 0) continue;
                    vec2 n_node_id = node_id + vec2(float(nx), float(ny));
                    vec2 n_node_pos = get_node_pos(n_node_id, time) + vec2(float(nx), float(ny));

                    vec2 pa = f - neighbor - node_pos;
                    vec2 ba = n_node_pos - node_pos;
                    float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
                    float line_d = length(pa - ba*h);

                    float dist = length(ba);
                    float alpha = smoothstep(1.5, 0.5, dist) * 0.1;
                    color = mix(color, indigo, smoothstep(0.005, 0.0, line_d) * alpha);
                }
            }
        }
    }

    gl_FragColor = vec4(color, 1.0);
}`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return shader;
}

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(canvas);
    syncSize();

    const gl = (canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const positionLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uMouse = gl.getUniformLocation(program, "u_mouse");

    const mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    function handleMouseMove(event: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = 1.0 - (event.clientY - rect.top) / rect.height;
        mouse.x = nx * canvas.width;
        mouse.y = ny * canvas.height;
      }
    }
    window.addEventListener("mousemove", handleMouseMove);

    let rafId: number;
    function render(t: number) {
      if (!canvas || !gl) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(render);
    }
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="block h-full w-full" />;
}
