"use client";

import { Canvas, useThree, extend } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useRef, useEffect } from 'react';
import { Vector3, Group, OrthographicCamera, SpotLight } from 'three';
import { GLTF as ThreeGLTF } from 'three-stdlib';

const myRoom = '/myroom.gltf'

// Extend the GLTF type to include cameras and lights
interface GLTFWithExtras extends ThreeGLTF {
  cameras: OrthographicCamera[];
  lights: (SpotLight)[];
}

// Create OrthographicCamera component
const OrthographicCameraComponent = ({ gltf }: { gltf: GLTFWithExtras }) => {
  const { scene, size, set } = useThree();
  const cameraRef = useRef<OrthographicCamera | null>(null);

  useEffect(() => {
    // Calculate aspect ratio
    const aspect = size.width / size.height;
    const frustumSize = 5;

    // Create an orthographic camera with the specified parameters
    const orthoCamera = new OrthographicCamera(
      frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2, 0.1, 1000
    );
    orthoCamera.rotation.set(0, 0, 0);
    orthoCamera.position.set(-1, 1, 1);
    orthoCamera.zoom = 1; // Set initial zoom level
    orthoCamera.updateProjectionMatrix();

    // Add the camera to the scene and set it as the active camera
    scene.add(orthoCamera);
    set({ camera: orthoCamera });
    cameraRef.current = orthoCamera;

    if (gltf.lights && gltf.lights.length > 0) {
      gltf.lights.forEach(light => scene.add(light));
    }

    // Optionally, add additional spotlights if needed
    const additionalSpotLight = new SpotLight(0xffffff, 1);
    additionalSpotLight.position.set(5, 5, 5);
    additionalSpotLight.angle = Math.PI / 6;
    additionalSpotLight.penumbra = 0.1;
    additionalSpotLight.decay = 2;
    additionalSpotLight.distance = 200;
    scene.add(additionalSpotLight);

  }, [gltf, scene, size, set]);

  return null;
};

const GLTFModel = () => {
  const gltf = useGLTF(myRoom, true) as unknown as GLTFWithExtras;
  const ref = useRef<Group>(null);

  const handleClick = (event: any) => {
    event.stopPropagation();
    const name = event.object.name;
    alert(`You clicked on ${name}`);
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

const Home = () => {
  const gltf = useGLTF(myRoom, true) as unknown as GLTFWithExtras;

  return (
    <span className="w-screen h-screen">
      <Canvas className="w-full h-full">
        <OrthographicCameraComponent gltf={gltf} />
        <ambientLight intensity={0.5} />
        <GLTFModel />
        <OrbitControls enableZoom={true} />
      </Canvas>
    </span>
  );
};

export default Home;
