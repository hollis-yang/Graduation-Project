
import ViewShedStage from "./ViewShedStage";
import * as Cesium from 'cesium'
let viewer=null
let viewShed = {}
let startPosition=null     //起始坐标
let endPosition= null       //终点坐标
let viewShedArr= []        //存储可视域区域的数组
let horizontalViewAngle = 90  //视角水平张角
let verticalViewAngle = 60    //视角垂直张角
let handler=null
export const ViewAnalysis = {
    start: (_viewer) => {
        viewer=_viewer
        let i = 0
        handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
        handler.setInputAction(movement =>
        {
          i++
          if(i === 1)
          {
             startPosition = viewer.scene.pickPosition(movement.position) //鼠标点击一次获取开始坐标
            if(!startPosition) return
            viewShed = new ViewShedStage(viewer,{
              viewPosition: startPosition,
              viewPositionEnd: startPosition,
              horizontalViewAngle: horizontalViewAngle,
              verticalViewAngle: verticalViewAngle
            })
            handler.setInputAction(movement => //鼠标移动的事件
              {
                endPosition =  viewer.scene.pickPosition(movement.endPosition)
                if(!endPosition) return
                viewShed.updatePosition(endPosition)
                if(!viewShed.sketch) {
                  viewShed.drawSketch()
                }
              }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)         
          }
          if(i === 2) //鼠标点击两次获取结束坐标
          { 
            i = 0
            endPosition =  viewer.scene.pickPosition(movement.position)
            viewShed.updatePosition(endPosition)
            viewShed.update()
            handler = handler && handler.destroy()  //销毁鼠标事件
            viewShedArr.push(viewShed)
          } 
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    },
    stop: () => {
        if(viewShed){
            viewShed.clear()
        }
    }
}

