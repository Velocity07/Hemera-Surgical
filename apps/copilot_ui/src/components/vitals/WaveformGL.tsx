import React, { useEffect, useRef } from 'react';
import { useVitalsStore, BUFFER_CAPACITY } from '../../store/useVitalsStore';

export interface WaveformGLProps {
    channelKey?: 'ecg' | 'spo2' | 'abp' | 'co2';
    channel?: 'ecg' | 'spo2' | 'abp' | 'co2';
    label: string;
    color: [number, number, number];
    units?: string;
}

const VERTEX_SHADER_SRC = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  uniform vec3 u_color;
  void main() {
    gl_FragColor = vec4(u_color, 0.95);
  }
`;

export const WaveformGL: React.FC<WaveformGLProps> = ({
    channelKey,
    channel,
    label,
    color,
    units,
}) => {
    const activeChannel = (channelKey || channel || 'ecg') as 'ecg' | 'spo2' | 'abp' | 'co2';
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const gl = canvas.getContext('webgl', {
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
        });

        if (!gl) {
            console.error('WebGL not supported for channel:', activeChannel);
            return;
        }

        // Compile Shaders
        const createShader = (type: number, src: string) => {
            const shader = gl.createShader(type);
            if (!shader) return null;
            gl.shaderSource(shader, src);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
        const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
        if (!vs || !fs) return;

        const program = gl.createProgram();
        if (!program) return;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(program));
            return;
        }

        gl.useProgram(program);

        const posAttrLoc = gl.getAttribLocation(program, 'a_position');
        const colorUniformLoc = gl.getUniformLocation(program, 'u_color');
        gl.uniform3f(colorUniformLoc, color[0], color[1], color[2]);

        // Pre-allocate coordinate buffer (X is static, Y is dynamic)
        const vertexData = new Float32Array(BUFFER_CAPACITY * 2);
        for (let i = 0; i < BUFFER_CAPACITY; i++) {
            vertexData[i * 2] = -1.0 + (2.0 * i) / (BUFFER_CAPACITY - 1);
            vertexData[i * 2 + 1] = 0.0;
        }

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

        gl.enableVertexAttribArray(posAttrLoc);
        gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 0, 0);

        // Setup High-DPI Canvas Resizing
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                const dpr = window.devicePixelRatio || 1;
                canvas.width = Math.floor(width * dpr);
                canvas.height = Math.floor(height * dpr);
                gl.viewport(0, 0, canvas.width, canvas.height);
            }
        });
        resizeObserver.observe(canvas);

        // Continuous 60 FPS Render Loop
        let animFrameId: number;
        const BLANKING_GAP = 55; // 0.55s erase gap at 100Hz

        const render = () => {
            const { channels } = useVitalsStore.getState();
            const rawSamples = channels[activeChannel];
            const head = channels.writeIndex;

            // Update Y amplitudes in place
            for (let i = 0; i < BUFFER_CAPACITY; i++) {
                vertexData[i * 2 + 1] = rawSamples[i];
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertexData);

            gl.clearColor(0.02, 0.03, 0.05, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Draw older sweep portion (ahead of blanking cursor)
            const olderStart = head + BLANKING_GAP;
            if (olderStart < BUFFER_CAPACITY) {
                const olderCount = BUFFER_CAPACITY - olderStart;
                gl.drawArrays(gl.LINE_STRIP, olderStart, olderCount);
            }

            // Draw newer sweep portion (behind blanking cursor)
            if (head > 1) {
                gl.drawArrays(gl.LINE_STRIP, 0, head);
            }

            animFrameId = requestAnimationFrame(render);
        };

        animFrameId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animFrameId);
            resizeObserver.disconnect();
            gl.deleteBuffer(vbo);
            gl.deleteProgram(program);
            gl.deleteShader(vs);
            gl.deleteShader(fs);
        };
    }, [activeChannel, color]);

    return (
        <div className="relative w-full h-full bg-[#05070A] overflow-hidden select-none">
            {/* Phosphor Grid Background */}
            <div
                className="absolute inset-0 pointer-events-none opacity-15"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, #1E293B 1px, transparent 1px), linear-gradient(to bottom, #1E293B 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }}
            />

            {/* Channel Header Overlay */}
            <div className="absolute top-1.5 left-2 z-10 flex items-center gap-2 font-mono">
                <span
                    className="text-[11px] font-bold tracking-wider uppercase drop-shadow-sm"
                    style={{ color: `rgb(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255})` }}
                >
                    {label}
                </span>
                {units && <span className="text-[9px] text-slate-500 font-medium">{units}</span>}
            </div>

            {/* Raw WebGL 2.0 Sweep Line Canvas */}
            <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
    );
};