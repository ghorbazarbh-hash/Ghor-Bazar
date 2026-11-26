// Thermal (POS) printing: only #print-root is printed, the rest of the page is hidden by CSS.
export function printThermal() {
  const style = document.createElement('style')
  style.id = 'thermal-page'
  style.textContent = '@page{margin:0}'
  document.head.appendChild(style)
  document.body.classList.add('print-thermal')
  const done = () => {
    document.body.classList.remove('print-thermal')
    style.remove()
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  window.print()
}
