import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

interface ThreeDViewerProps {
  modelUrl: string;
  fallbackImage: string;
  className?: string;
  zoomLevel?: number;
}

interface ModelProps {
  url: string;
  zoomLevel?: number;
}

const Model: React.FC<ModelProps> = ({ url, zoomLevel = 1 }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  // Load the GLB model
  const { scene } = useGLTF(url);
  
  // Auto-rotate the model
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5; // Slow rotation
      
      // Add slight bobbing motion
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
      
      // Scale slightly on hover
      const baseScale = zoomLevel;
      const targetScale = hovered ? baseScale * 1.1 : baseScale;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <group
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={scene.clone()} />
    </group>
  );
};

const LoadingSpinner: React.FC = () => (
  <Html center>
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
    </div>
  </Html>
);

const ErrorFallback: React.FC<{ image: string; name: string }> = ({ image, name }) => (
  <Html center>
    <img
      src={image}
      alt={name}
      className="w-32 h-32 object-cover rounded-lg"
      style={{ transform: 'translate(-50%, -50%)' }}
    />
  </Html>
);

const ThreeDViewer: React.FC<ThreeDViewerProps> = ({ 
  modelUrl, 
  fallbackImage, 
  className = "w-full h-48",
  zoomLevel = 1
}) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <img
        src={fallbackImage}
        alt="NFT Component"
        className={`${className} object-cover rounded-lg`}
      />
    );
  }

  return (
    <div className={`${className} relative bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg overflow-hidden`}>
      <Canvas
        camera={{ position: [0, 0, 5 / zoomLevel], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={1.2} />
        <directionalLight position={[10, 10, 5]} intensity={2} />
        <directionalLight position={[-10, -10, -5]} intensity={1.5} />
        <pointLight position={[0, 10, 0]} intensity={1} />
        <pointLight position={[0, -10, 0]} intensity={0.8} />
        
        {/* 3D Model */}
        <Suspense fallback={<LoadingSpinner />}>
          <Model url={modelUrl} zoomLevel={zoomLevel} />
        </Suspense>
        
        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={1}
          dampingFactor={0.05}
          enableDamping={true}
          maxDistance={10 / zoomLevel}
          minDistance={1.5 / zoomLevel}
        />
      </Canvas>
      
      {/* 3D Indicator */}
      <div className="absolute top-2 right-2 bg-purple-600/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full pointer-events-none">
        3D Interactive
      </div>
      
      {/* Controls Hint */}
      <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded pointer-events-none">
        Click & drag to rotate
      </div>
    </div>
  );
};

export default ThreeDViewer;