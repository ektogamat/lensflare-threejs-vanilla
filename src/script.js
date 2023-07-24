import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js'
import { LensFlareEffect, LensFlareParams } from './LensFlare'

const dracoLoader = new DRACOLoader()
const loader = new GLTFLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
dracoLoader.setDecoderConfig({ type: 'js' })
loader.setDRACOLoader(dracoLoader)


/**
 * Scene
*/
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
THREE.ColorManagement.enabled = false



/**
 * SkyBox
 */
const geometry = new THREE.SphereGeometry(45, 40, 40)
const texture = new THREE.TextureLoader().load('digital_painting_golden_hour_sunset.jpg')
texture.flipY = true
const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide, depthTest: false })

const skyBox = new THREE.Mesh(geometry, material)
skyBox.userData = 'no-occlusion'
scene.add(skyBox)

/**
 * SphereTest
 */
let params = {enableMeshes: false}

const sphereTest = new THREE.SphereGeometry(1, 40, 40)
const materialTest = new THREE.MeshPhysicalMaterial({ transmission: 1, thickness: 0.3, ior: 1.64, color: 'orange', roughness: 0.2, side: THREE.DoubleSide })
const spereTestMesh = new THREE.Mesh(sphereTest, materialTest)
materialTest.envMapIntensity = 3
spereTestMesh.position.x = 4.5
scene.add(spereTestMesh)

/**
 * SphereTestMetal
 */
const sphereTestMetal = new THREE.SphereGeometry(1, 40, 40)
const materialTestMetal = new THREE.MeshPhysicalMaterial({metalness: 0.9, roughness: 0.25 })
const spereTestMeshMetal = new THREE.Mesh(sphereTestMetal, materialTestMetal)
materialTest.envMapIntensity = 3
spereTestMeshMetal.position.x = 8.5
scene.add(spereTestMeshMetal)

/**
 * SphereTestTransparent
 */
const sphereTestTransparent = new THREE.SphereGeometry(1, 40, 40)
// const materialTestTransparent = new THREE.MeshPhysicalMaterial({ transmission: 0, thickness: 0.3, ior: 1.9, color: 'orange', roughness: 0.2, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
// const materialTestTransparent = new THREE.MeshPhysicalMaterial({ transmission: 0.8, thickness: 0.3, ior: 1.9, color: 'orange', roughness: 0.2, transparent: true, opacity: 0.87, side: THREE.DoubleSide })
// const materialTestTransparent = new THREE.MeshPhysicalMaterial({Transparent: 0.9, roughness: 0.25 })
const materialTestTransparent = new THREE.MeshPhongMaterial({ color: '#333634', transparent: true, opacity: 0.7 })
const spereTestMeshTransparent = new THREE.Mesh(sphereTestTransparent, materialTestTransparent)
materialTest.envMapIntensity = 3
spereTestMeshTransparent.position.x = 6.5
scene.add(spereTestMeshTransparent)

/**
 * SphereTest
 */
const sphereTestDenseGlass = new THREE.SphereGeometry(1, 40, 40)
const materialTestDenseGlass = new THREE.MeshPhysicalMaterial({ transmission: 0.4, thickness: 0.2, clearcoat: 0.5, ior: 1.1, color: '#1c1036', roughness: 0.2, envMapIntensity: 20, side: THREE.DoubleSide })
const spereTestMeshDenseGlass = new THREE.Mesh(sphereTestDenseGlass, materialTestDenseGlass)
materialTestDenseGlass.envMapIntensity = 3
spereTestMeshDenseGlass.position.x = 10.5
scene.add(spereTestMeshDenseGlass)


/**
 * ScreenResolution
 */
const screenRes = {
    width: window.innerWidth,
    height: window.innerHeight,
}

window.addEventListener('resize', () => {
    // Update screenRes
    screenRes.width = window.innerWidth
    screenRes.height = window.innerHeight

    // Update camera
    camera.aspect = screenRes.width / screenRes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(screenRes.width, screenRes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(45, screenRes.width / screenRes.height, 0.1, 1000)
camera.position.z = 8.5
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.maxDistance = 20

/**
 * Lights
 */
const light = new THREE.DirectionalLight()
light.intensity = 1
light.position.set(-20, 20, 50)
scene.add(light)

const ambientLight = new THREE.AmbientLight()
ambientLight.intensity = 0.9
scene.add(ambientLight)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
})
renderer.outputColorSpace = THREE.LinearSRGBColorSpace
renderer.setSize(screenRes.width, screenRes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

let newEnvMap

new EXRLoader().load('background.exr', function (texture) {
    const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture)
    newEnvMap = exrCubeRenderTarget ? exrCubeRenderTarget.texture : null
    loadObjectAndAndEnvMap()
    texture.dispose()
})

const pmremGenerator = new THREE.PMREMGenerator(renderer)
pmremGenerator.compileEquirectangularShader()

function loadObjectAndAndEnvMap() {
    scene.environment = newEnvMap
}

let glassDome
loader.load('sphere-transformed.glb', function (gltf) {
    glassDome = gltf.scene

    const glassDomeMaterial = glassDome.children[0].material
    let domeMaterial = glassDome.children[1].material
    domeMaterial.roughness = 0.6

    glassDomeMaterial.iridescence = 0.7
    glassDomeMaterial.iridescenceIOR = 3.46
    glassDomeMaterial.thickness = 0.05
    glassDomeMaterial.ior = 1.4
    glassDomeMaterial.side = THREE.DoubleSide
    glassDomeMaterial.roughness = 0.15
    glassDomeMaterial.clearcoat = 1
    glassDomeMaterial.metalness = 0.22

    gltf.scene.scale.set(0.7, 0.7, 0.7)

    scene.add(gltf.scene)
    glassDome.visible = false
})

/**
 * Lens Flare
 */
const lensFlareEffect = LensFlareEffect()
scene.add(lensFlareEffect)

// Debug Lens Flare
const gui = new dat.GUI()
gui.add(lensFlareEffect.material.uniforms.enabled, 'value').name('Enabled?')
gui.add(lensFlareEffect.material.uniforms.followMouse, 'value').name('Follow Mouse?')
gui.add(lensFlareEffect.material.uniforms.starPoints, 'value').name('starPoints').min(0).max(9).step(1)
gui.add(lensFlareEffect.material.uniforms.glareSize, 'value').name('glareSize').min(0).max(2)
gui.add(lensFlareEffect.material.uniforms.flareSize, 'value').name('flareSize').min(0).max(0.1).step(0.001)
gui.add(lensFlareEffect.material.uniforms.flareSpeed, 'value').name('flareSpeed').min(0).max(1).step(0.01)
gui.add(lensFlareEffect.material.uniforms.flareShape, 'value').name('flareShape').min(0).max(2).step(0.01)
gui.add(lensFlareEffect.material.uniforms.haloScale, 'value').name('haloScale').min(-0.5).max(1).step(0.01)
gui.add(LensFlareParams, 'opacity').name('opacity').min(0).max(1).step(0.01)
gui.add(lensFlareEffect.material.uniforms.ghostScale, 'value').name('ghostScale').min(0).max(2).step(0.01)
gui.add(lensFlareEffect.material.uniforms.animated, 'value').name('animated')
gui.add(lensFlareEffect.material.uniforms.anamorphic, 'value').name('anamorphic')
gui.add(lensFlareEffect.material.uniforms.secondaryGhosts, 'value').name('secondaryGhosts')
gui.add(lensFlareEffect.material.uniforms.starBurst, 'value').name('starBurst')
gui.add(lensFlareEffect.material.uniforms.aditionalStreaks, 'value').name('aditionalStreaks')

// Debug Meshes (Demo scene only)
gui.add(params, 'enableMeshes').name('Debug meshes (demo)?').onChange(update)
function update(){
    spereTestMesh.visible = params.enableMeshes
    spereTestMeshMetal.visible = params.enableMeshes
    spereTestMeshTransparent.visible = params.enableMeshes
    spereTestMeshDenseGlass.visible = params.enableMeshes
    if (glassDome) glassDome.visible = params.enableMeshes
}
update()

gui.close()

/**
 * Animate
 */
const clock = new THREE.Clock()
const tick = () => {
    controls.update()

    renderer.render(scene, camera)

    if (glassDome) {
        glassDome.rotation.y += 0.004
        glassDome.rotation.x += 0.002
        glassDome.position.y = Math.sin(clock.getElapsedTime()) / 4.3
    }

    window.requestAnimationFrame(tick)
}

tick()
