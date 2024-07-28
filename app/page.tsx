"use client";

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useRef, useEffect, useState } from 'react';
import { Vector3, Group, OrthographicCamera, SpotLight, Points, BufferGeometry, BufferAttribute, ShaderMaterial, AdditiveBlending, Mesh, MeshStandardMaterial, TextureLoader, CanvasTexture, Clock } from 'three';
import { GLTF as ThreeGLTF } from 'three-stdlib';
import gsap from 'gsap';

const myRoom = '/myroom.gltf';

interface GLTFWithExtras extends ThreeGLTF {
  cameras: OrthographicCamera[];
  lights: SpotLight[];
}

const particleShaderMaterial = new ShaderMaterial({
  uniforms: {
    pointTexture: { value: new TextureLoader().load('/circle_01.png') },
    time: { value: 0.0 },
  },
  vertexShader: `
    attribute float size;
    attribute vec3 customColor;
    varying vec3 vColor;
    varying float vAlpha;
    uniform float time;
    void main() {
      vColor = customColor;
      vAlpha = 0.6 + 0.4 * sin(position.x * 10.0 + position.y * 10.0 + position.z * 10.0 + time);
      vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
      gl_PointSize = size * ( 10.0 / -mvPosition.z );
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D pointTexture;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      gl_FragColor = vec4( vColor, vAlpha );
      gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
      if ( gl_FragColor.a < 0.1 ) discard;
    }
  `,
  blending: AdditiveBlending,
  depthTest: false,
  transparent: true,
});

const Particles = () => {
  const { scene } = useThree();
  const clock = new Clock();

  useEffect(() => {
    const clock = new Clock();
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
  
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * 10;
      positions[i * 3 + 1] = (Math.random() * 2 - 1) * 10;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * 10;
  
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;
  
      sizes[i] = Math.random() * 5 + 1; // Make the particles smaller
    }
  
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new BufferAttribute(colors, 3));
    geometry.setAttribute('size', new BufferAttribute(sizes, 1));
  
    const particles = new Points(geometry, particleShaderMaterial);
    scene.add(particles);
  
    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      particleShaderMaterial.uniforms.time.value = elapsedTime;
  
      const positions = geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        positions[idx + 1] -= 0.01; // Move downward
        if (positions[idx + 1] < -10) {
          positions[idx + 1] = 10; // Reset to top
        }
        positions[idx] += Math.sin(elapsedTime + positions[idx + 1]) * 0.001; // Smooth horizontal movement
        positions[idx + 2] += Math.cos(elapsedTime + positions[idx + 1]) * 0.001; // Smooth depth movement
      }
      geometry.attributes.position.needsUpdate = true;
  
      requestAnimationFrame(animate);
    };
  
    animate();
  
    return () => {
      scene.remove(particles);
      geometry.dispose();
    };
  }, [scene]);
  

  return null;
};

const OrthographicCameraComponent = ({ gltf, cameraRef }: { gltf: GLTFWithExtras, cameraRef: React.MutableRefObject<OrthographicCamera | null> }) => {
  const { scene, size, set } = useThree();

  useEffect(() => {
    const aspect = size.width / size.height;
    const frustumSize = 5;

    const orthoCamera = new OrthographicCamera(
      frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, 0.01, 1000
    );
    orthoCamera.rotation.set(-0.3310991962223451, -0.824735756618125, -0.24727542622427348);
    orthoCamera.position.set(-1, 1, 1);
    orthoCamera.zoom = 1.5866734416093422;
    orthoCamera.updateProjectionMatrix();

    scene.add(orthoCamera);
    set({ camera: orthoCamera });
    cameraRef.current = orthoCamera;

    if (gltf.lights && gltf.lights.length > 0) {
      gltf.lights.forEach(light => scene.add(light));
    }

    const additionalSpotLight = new SpotLight(0xffffff, 200);
    additionalSpotLight.position.set(5, 5, 5);
    additionalSpotLight.angle = Math.PI / 6;
    additionalSpotLight.penumbra = 0.1;
    additionalSpotLight.decay = 2;
    additionalSpotLight.distance = 200;
    scene.add(additionalSpotLight);

    const interval = setInterval(() => {
      if (cameraRef.current) {
        console.log('Camera Position:', cameraRef.current.position);
        console.log('Camera Zoom:', cameraRef.current.zoom);
        console.log('Camera Rotation:', cameraRef.current.rotation);
      }
    }, 5000);

    return () => clearInterval(interval);

  }, [gltf, scene, size, set, cameraRef]);

  return null;
};

const GLTFModel = ({ cameraRef, controlsRef, setControlsEnabled, setMonitorPosition }: { cameraRef: React.MutableRefObject<OrthographicCamera | null>, controlsRef: React.MutableRefObject<any>, setControlsEnabled: (enabled: boolean) => void, setMonitorPosition: (position: Vector3) => void }) => {
  const gltf = useGLTF(myRoom, true) as unknown as GLTFWithExtras;
  const ref = useRef<Group>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.traverse((node) => {
        if ((node as Mesh).isMesh) {
          const meshMaterial = (node as Mesh).material;
          if (Array.isArray(meshMaterial)) {
            meshMaterial.forEach(mat => {
              if (mat instanceof MeshStandardMaterial) {
                mat.side = 2;
              }
            });
          } else {
            if (meshMaterial instanceof MeshStandardMaterial) {
              meshMaterial.side = 2;
            }
          }
        }

        // Find monitor and get its position
        if (node.name === 'monitor') {
          setMonitorPosition((node as Mesh).position);
        }
      });
    }
  }, [gltf, setMonitorPosition]);

  const handleClick = (event: any) => {
    event.stopPropagation();
    const targetPosition = event.object.position.clone();

    console.log('Model clicked:', event.object.name);  // Log the name of the clicked model

    if (cameraRef.current && controlsRef.current) {
      setControlsEnabled(false);

      gsap.to(cameraRef.current.position, {
        duration: 2,
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z + 1,
        ease: "power3.inOut",
        onUpdate: () => {
          cameraRef.current?.lookAt(targetPosition);
          if (controlsRef.current) {
            controlsRef.current.target.copy(targetPosition);
            controlsRef.current.update();
          }
        },
        onComplete: () => {
          // setControlsEnabled(true);
        }
      });
      gsap.to(cameraRef.current.rotation, {
        duration: 2,
        x: 0,
        y: 0,
        z: 0,
        ease: "power3.inOut"
      });
      gsap.to(cameraRef.current, {
        duration: 4,
        zoom: 18.34741178101953,
        ease: "power3.inOut",
        onUpdate: () => {
          cameraRef.current?.updateProjectionMatrix();
        }
      });
    }
  };

  return (
    <primitive
      ref={ref}
      object={gltf.scene}
      onClick={handleClick}
      position={new Vector3(0, 0, 0)}
    />
  );
};

interface InteractiveMonitorProps {
  position: Vector3;
  offset: Vector3;
  size: { width: number, height: number };
}

const InteractiveMonitor = ({ position, offset, size }: InteractiveMonitorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  const [hoveredIcon, setHoveredIcon] = useState<number | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 512;
        canvas.height = 512;

        const drawDesktop = () => {
          context.fillStyle = '#0078D4'; // Windows 11 background color
          context.fillRect(0, 0, canvas.width, canvas.height);

          // Draw taskbar
          context.fillStyle = '#000000';
          context.fillRect(0, canvas.height - 40, canvas.width, 40);

          // Draw start button
          context.fillStyle = '#FFFFFF';
          context.beginPath();
          context.moveTo(10, canvas.height - 30);
          context.lineTo(30, canvas.height - 30);
          context.lineTo(20, canvas.height - 10);
          context.closePath();
          context.fill();

          // Draw some icons on the taskbar
          const projects = [
            { name: 'Project 1', url: 'https://react-weather-app-bay-six.vercel.app/' },
            { name: 'Project 2', url: 'https://example.com/project2' },
            { name: 'Project 3', url: 'https://example.com/project3' }
          ];
          
          projects.forEach((project, index) => {
            const x = 50 + index * 30;
            context.fillStyle = hoveredIcon === index ? '#FFD700' : '#FFFFFF'; // Change color on hover
            context.fillRect(x, canvas.height - 30, 20, 20);
            context.fillStyle = '#000000';
            context.fillText(project.name.charAt(0), x + 5, canvas.height - 15);
          });
        };

        drawDesktop();

        const handleClick = (e: MouseEvent) => {
          const x = e.offsetX;
          const y = e.offsetY;

          if (y > canvas.height - 40) {
            const projects = [
              { name: 'Project 1', url: 'https://react-weather-app-bay-six.vercel.app/' },
              { name: 'Project 2', url: 'https://example.com/project2' },
              { name: 'Project 3', url: 'https://example.com/project3' }
            ];

            projects.forEach((project, index) => {
              const iconX = 50 + index * 30;
              if (x >= iconX && x <= iconX + 20) {
                console.log("Clicked project: ", project.name);
                setOpenWindows(prev => [...prev, project.url]);
              }
            });
          }
        };

        const handleMouseMove = (e: MouseEvent) => {
          const x = e.offsetX;
          const y = e.offsetY;

          if (y > canvas.height - 40) {
            const projects = [
              { name: 'Project 1', url: 'https://react-weather-app-bay-six.vercel.app/' },
              { name: 'Project 2', url: 'https://example.com/project2' },
              { name: 'Project 3', url: 'https://example.com/project3' }
            ];

            let found = false;
            projects.forEach((project, index) => {
              const iconX = 50 + index * 30;
              if (x >= iconX && x <= iconX + 20) {
                setHoveredIcon(index);
                found = true;
              }
            });
            if (!found) setHoveredIcon(null);
          } else {
            setHoveredIcon(null);
          }

          drawDesktop();
        };

        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousemove', handleMouseMove);

        return () => {
          canvas.removeEventListener('click', handleClick);
          canvas.removeEventListener('mousemove', handleMouseMove);
        };
      }
    }
  }, [hoveredIcon]);

  const screenTexture = new CanvasTexture(canvasRef.current || document.createElement('canvas'));
  const finalPosition = position.clone().add(offset);

  return (
    <>
      <mesh position={finalPosition}>
        <planeGeometry args={[size.width, size.height]} />
        <meshBasicMaterial map={screenTexture} />
      </mesh>
      {openWindows.map((url, index) => (
        <mesh key={index} position={new Vector3(0, 0, 0.1 * (index + 1))}>
          <planeGeometry args={[size.width - 0.2, size.height - 0.2]} />
          <meshBasicMaterial>
            <iframe src={url} width={size.width * 100} height={size.height * 100} />
          </meshBasicMaterial>
        </mesh>
      ))}
    </>
  );
};




const Home = () => {
  const cameraRef = useRef<OrthographicCamera | null>(null);
  const controlsRef = useRef<any>(null);
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [monitorPosition, setMonitorPosition] = useState<Vector3>(new Vector3(0, 0, 0));
  const [offset, setOffset] = useState<Vector3>(new Vector3(0, 0, 0.1)); // Initialize with your desired offset
  const [monitorSize, setMonitorSize] = useState({ width: .2, height: .2 }); // Initialize with your desired size

  return (
    <span className="w-screen h-screen">
      <Canvas className="w-full h-full">
        <OrthographicCameraComponent gltf={useGLTF(myRoom, true) as unknown as GLTFWithExtras} cameraRef={cameraRef} />
        <ambientLight intensity={0.5} />
        <GLTFModel cameraRef={cameraRef} controlsRef={controlsRef} setControlsEnabled={setControlsEnabled} setMonitorPosition={setMonitorPosition} />
        <Particles />
        <InteractiveMonitor position={monitorPosition} offset={offset} size={monitorSize} />
        {controlsEnabled && <OrbitControls ref={controlsRef} />} 
      </Canvas>
    </span>
  );
};

export default Home;
