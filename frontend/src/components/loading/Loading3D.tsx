import React, { useRef, useMemo, Suspense, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    Text,
    Float,
    PerspectiveCamera,
    Environment,
    Grid
} from '@react-three/drei';
import * as THREE from 'three';

// Simple Error Boundary for the 3D Canvas
class SceneErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: any, errorInfo: any) {
        console.error("3D Scene Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-cyan-400 font-mono text-sm space-y-4">
                    <div className="animate-pulse">⚡️ System Initializing...</div>
                </div>
            );
        }
        return this.props.children;
    }
}

// Lightning Bolt Component - Simplified for stability
const LightningBolt = () => {
    const meshRef = useRef<THREE.Mesh>(null);

    const shape = useMemo(() => {
        const s = new THREE.Shape();
        s.moveTo(0, 2.5);
        s.lineTo(1.5, 0.5);
        s.lineTo(0.5, 0.5);
        s.lineTo(1.8, -2.5);
        s.lineTo(-0.3, 0);
        s.lineTo(0.8, 0);
        s.lineTo(0, 2.5);
        return s;
    }, []);

    const extrudeSettings = {
        steps: 1,
        depth: 0.5,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: 0.1,
        bevelOffset: 0,
        bevelSegments: 2
    };

    useFrame((state) => {
        if (meshRef.current) {
            const t = state.clock.getElapsedTime();
            meshRef.current.rotation.y = Math.sin(t * 1.5) * 0.4;
            const pulse = 1 + Math.sin(t * 40) * 0.04;
            meshRef.current.scale.set(pulse, pulse, pulse);
        }
    });

    return (
        <Float speed={4} rotationIntensity={0.5} floatIntensity={1}>
            <mesh ref={meshRef} position={[0, -0.5, 0]}>
                <extrudeGeometry args={[shape, extrudeSettings]} />
                <meshBasicMaterial
                    color="#00ffff"
                    transparent
                    opacity={0.9}
                    wireframe={false}
                />
                <pointLight color="#00ffff" intensity={100} distance={10} />
            </mesh>
        </Float>
    );
};

// Scene Content - Stripped of heavy effects
const Scene = () => {
    return (
        <Suspense fallback={null}>
            <color attach="background" args={['#010101']} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={45} />

            <LightningBolt />

            <Text
                fontSize={0.8}
                position={[0, -2.5, 0]}
                color="#ff00e5"
                anchorX="center"
                anchorY="middle"
            >
                SznPay
            </Text>

            {/* Simple Floor Grid */}
            <Grid
                position={[0, -3, 0]}
                infiniteGrid
                fadeDistance={20}
                fadeStrength={5}
                sectionSize={2}
                sectionColor="#ff00e5"
                sectionThickness={1}
                cellSize={1}
                cellColor="#00f2ff"
                cellThickness={0.5}
            />

            <Environment preset="night" />
        </Suspense>
    );
};

const Loading3D: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[10000] bg-[#010101] w-full h-full flex flex-col items-center justify-center overflow-hidden">
            <SceneErrorBoundary>
                <Canvas
                    gl={{
                        antialias: false,
                        powerPreference: 'high-performance',
                        alpha: false,
                        stencil: false,
                        depth: true
                    }}
                    dpr={[1, 1.5]}
                >
                    <Scene />
                </Canvas>
            </SceneErrorBoundary>
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-cyan-400/60 font-mono text-[10px] tracking-[0.5em] uppercase animate-pulse pointer-events-none">
                Powering Up SznPay...
            </div>
        </div>
    );
};

export default Loading3D;
