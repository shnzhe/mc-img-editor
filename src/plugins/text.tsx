import Konva from 'konva'
import { PluginProps } from '../type'
import { transformerStyle } from '../constants'

let transformer: any = null
let selectedNode: any = null

const defalutParamValue = {
  fontSize: 12,
  color: '#F5222D',
}

function removeTextareaBlurModal() {
  const textareaBlurModal = document.getElementById('textareaBlurModal')
  if (textareaBlurModal) {
    textareaBlurModal.removeEventListener('click', removeTextareaBlurModal)
    document.body.removeChild(textareaBlurModal)
  }
}

// 防止 textarea blur 时触发 stage click 事件
function addTextareaBlurModal(stage: any) {
  if (document.getElementById('textareaBlurModal')) return

  const container = stage.container().getBoundingClientRect()
  const textareaBlurModal = document.createElement('div')
  textareaBlurModal.id = 'textareaBlurModal'
  textareaBlurModal.style.position = 'fixed'
  textareaBlurModal.style.left = container.left + 'px'
  textareaBlurModal.style.top = container.top + 'px'
  textareaBlurModal.style.width = container.width + 'px'
  textareaBlurModal.style.height = container.height + 'px'
  textareaBlurModal.style.zIndex = '999'

  document.body.appendChild(textareaBlurModal)

  textareaBlurModal.addEventListener('click', removeTextareaBlurModal)
}

function createTextarea(stage: any, layer: any, transformer: any, textNode: any, historyStack: any) {
  const container = stage.container().getBoundingClientRect()
  const textarea = document.createElement('textarea')
  textarea.value = textNode.text()
  textarea.style.position = 'absolute'
  textarea.style.left = container.left + textNode.x() + 'px'
  textarea.style.top = container.top + textNode.y() + 'px'
  textarea.style.width = textNode.width() - 5 + 'px'
  textarea.style.height = textNode.height() - 5 + 'px'
  textarea.style.lineHeight = String(textNode.lineHeight())
  textarea.style.padding = textNode.padding() + 'px'
  textarea.style.margin = '0px'
  textarea.style.fontSize = textNode.fontSize() + 'px'
  textarea.style.color = textNode.fill()
  textarea.style.fontFamily = textNode.fontFamily()
  textarea.style.border = 'none'
  textarea.style.outline = 'none'
  textarea.style.overflow = 'hidden'
  textarea.style.background = 'none'
  textarea.style.resize = 'none'
  textarea.style.zIndex = '1000'
  textarea.style.boxSizing = 'content-box'

  textarea.addEventListener('keyup', function(e: any) {
    textNode.text(e.target.value)
    layer.draw()
    textarea.style.width = textNode.width() + 'px'
    textarea.style.height = textNode.height() + 'px'
  })

  textarea.addEventListener('blur', function () {
    if (textarea.value !== '') {
      textNode.text(textarea.value)
      transformer.hide()
      textNode.show()
    } else {
      textNode.destroy()
      transformer.destroy()
    }

    textarea.parentNode!.removeChild(textarea)
    layer.draw()
    removeTextareaBlurModal()
    historyStack.push(textNode)
  })

  return textarea
}

function enableTransform(stage: any, layer: any, node: any) {
  if (!transformer) {
    transformer = new Konva.Transformer({ ...transformerStyle, enabledAnchors: [], padding: 3 })
    layer.add(transformer)
    transformer.attachTo(node)
    node.on('mouseenter', function() {
      stage.container().style.cursor = 'move'
    })
    node.on('mouseleave', function() {
      stage.container().style.cursor = 'text'
    })
    stage.container().style.cursor = 'move'
  }

  node && node.draggable(true)
  layer.draw()
}

function disableTransform(stage: any, layer: any, node: any) {
  if (transformer) {
    transformer.remove()
    transformer = null
  }

  if (node) {
    node.draggable(false)
    node.off('mouseenter')
    node.off('mouseleave')
    stage.container().style.cursor = 'text'
  }

  selectedNode = null
  layer.draw()
}

export default {
  name: 'text',
  iconfont: 'iconfont icon-text',
  title: '插入文字',
  params: ['fontSize', 'color'],
  defalutParamValue,
  shapeName: 'text',
  onEnter: ({stage}) => {
    stage.container().style.cursor = 'text'
  },
  onClick: ({event, stage, layer, paramValue, historyStack}) => {
    if (event.target.name && event.target.name() === 'text') {
      // 之前没有选中节点或者在相同节点之间切换点击
      if (!selectedNode || selectedNode._id !== event.target._id) {
        selectedNode && disableTransform(stage, layer, selectedNode)
        enableTransform(stage, layer, event.target)
        selectedNode = event.target
      }
      return
    } else if (selectedNode) {
      disableTransform(stage, layer, selectedNode)
      return
    }

    const fontSize = (paramValue && paramValue.fontSize) ? paramValue.fontSize : defalutParamValue.fontSize
    const color = (paramValue && paramValue.color) ? paramValue.color : defalutParamValue.color
    const startPos = stage.getPointerPosition()
    const textNode = new Konva.Text({
      name: 'text',
      x: startPos.x,
      y: startPos.y - 10, // fix konvajs incorrect position of text
      fontSize,
      fill: color,
      padding: 3,
      lineHeight: 1.2,
    })

    // 由于 konvajs 的文本渲染和浏览器渲染的样式不一致，所以使用 Transformer 的边框来代替 textarea 自身的边框
    const textareaTransformer = new Konva.Transformer({
      node: textNode as any,
      enabledAnchors: [],
      rotateEnabled: false,
      borderStroke: color,
    })

    layer.add(textNode)
    layer.add(textareaTransformer)
    textNode.hide()
    layer.draw()

    const textarea = createTextarea(stage, layer, textareaTransformer, textNode, historyStack)
    document.body.appendChild(textarea)
    textarea.focus()
    addTextareaBlurModal(stage)

    textNode.on('dblclick dbltap', function(e) {
      // dblclick 前会触发两次 onClick 事件，因此要清楚 onClick 事件里的状态
      disableTransform(stage, layer, selectedNode)

      e.cancelBubble = true
      const textarea = createTextarea(stage, layer, textareaTransformer, textNode, historyStack)
      document.body.appendChild(textarea)
      textarea.focus()
      textNode.hide()
      textareaTransformer.show()
      layer.draw()
      addTextareaBlurModal(stage)
    })
  },
  onLeave: ({stage, layer}) => {
    stage.container().style.cursor = 'default'
    removeTextareaBlurModal()
    disableTransform(stage, layer, selectedNode)
  },
}  as PluginProps