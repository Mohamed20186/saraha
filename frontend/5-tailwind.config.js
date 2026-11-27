export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: { extend: { fontFamily: { sans: ['Inter', 'Cairo', 'system-ui', 'sans-serif'] },
    colors: { brand: { 50:'#f5f3ff',100:'#ede9fe',200:'#ddd6fe',400:'#a78bfa',500:'#8b5cf6',600:'#7c3aed',700:'#6d28d9',900:'#2e1065' } },
    keyframes: { pop: { '0%':{opacity:0,transform:'translateY(8px) scale(.98)'}, '100%':{opacity:1,transform:'none'} } },
    animation: { pop: 'pop .25s ease-out' } } },
}
