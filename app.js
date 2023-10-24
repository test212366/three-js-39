import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader' 
import GUI from 'lil-gui'
import gsap from 'gsap'
import fragmentShader from './shaders/fragment.glsl'
import vertexShader from './shaders/vertex.glsl'
 
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass'
import {GlitchPass} from 'three/examples/jsm/postprocessing/GlitchPass'

import map from './earthjpg.jpg'


export default class Sketch {
	constructor(options) {
		
		this.scene = new THREE.Scene()
		
		this.container = options.dom
		
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		
		
		// // for renderer { antialias: true }
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		this.renderTarget = new THREE.WebGLRenderTarget(this.width, this.height)
		this.renderer.setSize(this.width ,this.height )
		this.renderer.setClearColor(0xeeeeee, 1)
		this.renderer.useLegacyLights = true
		this.renderer.outputEncoding = THREE.sRGBEncoding
 

		 
		this.renderer.setSize( window.innerWidth, window.innerHeight )

		this.container.appendChild(this.renderer.domElement)
 


		this.camera = new THREE.PerspectiveCamera( 70,
			 this.width / this.height,
			 0.01,
			 10
		)
 
		this.camera.position.set(0, 0, 2) 
		this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.time = 0


		this.dracoLoader = new DRACOLoader()
		this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
		this.gltf = new GLTFLoader()
		this.gltf.setDRACOLoader(this.dracoLoader)

		this.isPlaying = true

		this.addObjects()		 
		this.resize()
		this.render()
		this.setupResize()

 
	}

	settings() {
		let that = this
		this.settings = {
			progress: 0
		}
		this.gui = new GUI()
		this.gui.add(this.settings, 'progress', 0, 1, 0.01)
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this))
	}

	resize() {
		this.width = this.container.offsetWidth
		this.height = this.container.offsetHeight
		this.renderer.setSize(this.width, this.height)
		this.camera.aspect = this.width / this.height


		// this.imageAspect = 853/1280
		// let a1, a2
		// if(this.height / this.width > this.imageAspect) {
		// 	a1 = (this.width / this.height) * this.imageAspect
		// 	a2 = 1
		// } else {
		// 	a1 = 1
		// 	a2 = (this.height / this.width) / this.imageAspect
		// } 


		// this.material.uniforms.resolution.value.x = this.width
		// this.material.uniforms.resolution.value.y = this.height
		// this.material.uniforms.resolution.value.z = a1
		// this.material.uniforms.resolution.value.w = a2

		this.camera.updateProjectionMatrix()



	}


	addObjects() {
		let that = this
		this.materialShader = new THREE.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable'
			},
			side: THREE.DoubleSide,
			uniforms: {
				time: {value: 0},
				resolution: {value: new THREE.Vector4()}
			},
			vertexShader,
			fragmentShader
		})


		this.material = new THREE.MeshBasicMaterial({
			map: new THREE.TextureLoader().load(map)
		})
		
		this.geometry = new THREE.SphereGeometry(1,60, 60)
		this.planet = new THREE.Mesh(this.geometry, this.material)
 
		this.scene.add(this.planet)


		let mesh = new  THREE.Mesh(
			new THREE.SphereGeometry(0.03, 20, 20),
			new THREE.MeshBasicMaterial({color: 0xff0000})
		)
		let mesh1 = new  THREE.Mesh(
			new THREE.SphereGeometry(0.03, 20, 20),
			new THREE.MeshBasicMaterial({color: 0x00ff00})
		)


		const convertLatLngToCartesian = (lat, lon) => {

			const phi = (90 - lat) * (Math.PI / 180)
			const thelta = (lon + 180) * (Math.PI / 180)

	 

			let x = - (Math.sin(phi) * Math.cos(thelta))
			let y =  (Math.sin(phi) * Math.sin(thelta))
			let z = (Math.cos(phi))
			return {
				x,y,z
			}
		}


		let point1 = {
			lat: 50.4501,
			lng: 30.5234
		}

		let point2 = {
			lat: 60.6345,
			lng: 30.5528
		}


		let pos = convertLatLngToCartesian(point1.lat, point1.lng)
		let pos1 = convertLatLngToCartesian(point2.lat, point1.lng)

 
		mesh.position.set(pos.x, pos.y, pos.z)
		mesh1.position.set(pos1.x, pos1.y, pos1.z)


		this.scene.add(mesh)
		this.scene.add(mesh1)

		this.getCurve(pos, pos1)
 
	}
	getCurve(p1, p2) {

		let v1 = new THREE.Vector3(p1.x, p1.y, p1.z)
		let v2 = new THREE.Vector3(p1.x, p2.y, p2.z)
		let points = []

		for (let i = 0; i <= 20; i++) {
			let p = new THREE.Vector3().lerpVectors(v1, v2, i / 20)
			p.normalize()
			p.multiplyScalar(1 + 0.04 * Math.sin(Math.PI * i /20))
			points.push(p)
			
		}
		let path = new THREE.CatmullRomCurve3(points)


		const geometry = new THREE.TubeGeometry(path, 20, 0.01, 8,false)
		// const material = new THREE.MeshBasicMaterial({color: 0x0000ff})
		const mesh = new THREE.Mesh(geometry, this.materialShader)
		this.scene.add(mesh)
	}


	addLights() {
		const light1 = new THREE.AmbientLight(0xeeeeee, 0.5)
		this.scene.add(light1)
	
	
		const light2 = new THREE.DirectionalLight(0xeeeeee, 0.5)
		light2.position.set(0.5,0,0.866)
		this.scene.add(light2)
	}

	stop() {
		this.isPlaying = false
	}

	play() {
		if(!this.isPlaying) {
			this.isPlaying = true
			this.render()
		}
	}

	render() {
		if(!this.isPlaying) return
		this.time += 0.05
		this.materialShader.uniforms.time.value = this.time
		 
		//this.renderer.setRenderTarget(this.renderTarget)
		this.renderer.render(this.scene, this.camera)
		//this.renderer.setRenderTarget(null)
 
		requestAnimationFrame(this.render.bind(this))
	}
 
}
new Sketch({
	dom: document.getElementById('container')
})
 