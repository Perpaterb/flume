import React from "react";
import styles from "./Stage.css";
import { Portal } from "react-portal";
import ContextMenu from "../ContextMenu/ContextMenu";
import { NodeTypesContext, NodeDispatchContext} from "../../context";
import Draggable from "../Draggable/Draggable";
import orderBy from "lodash/orderBy";
import clamp from "lodash/clamp";
import { STAGE_ID } from '../../constants'

const Stage = ({
  nodes,
  scale,
  translate,
  editorId,
  dispatchStageState,
  children,
  outerStageChildren,
  numNodes,
  stageRef,
  spaceToPan,
  manualDispatchNodes,
  dispatchComments,
  disableComments,
  disablePan,
  disableZoom
}) => {
  const nodeTypes = React.useContext(NodeTypesContext);
  const dispatchNodes = React.useContext(NodeDispatchContext);
  const wrapper = React.useRef();
  const translateWrapper = React.useRef();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuCoordinates, setMenuCoordinates] = React.useState({ x: 0, y: 0 });
  const dragData = React.useRef({ x: 0, y: 0 });
  const [spaceIsPressed, setSpaceIsPressed] = React.useState(false);

  //start perp edit
  const menuOptionsStage1stRight = React.useMemo(
    () => {
      const options = orderBy(
        Object.values(nodeTypes)
          .filter(node => node.addable !== false)
          .map(node => ({
            value: node.type,
            label: node.label,
            description: node.description,
            sortIndex: node.sortIndex,
            node
          })),
        ["sortIndex", "label"]
      )

      options.unshift({ value: "get_variable", label: "Get Variable", description: "retrieve a previously created variable", internalType: "get_variable" })
      options.unshift({ value: "call_function", label: "Call Function", description: "This node is how you call/run a previously created function", internalType: "call_function" })

      if (!disableComments) {
        options.push({ value: "comment", label: "Comment", description: "A comment for documenting nodes", internalType: "comment" })
      }
      return options
    },
    [nodeTypes, disableComments]
  );

  const [menuOptions, setMenuOptions] = React.useState(menuOptionsStage1stRight);
  //end perp edit


  const setStageRect = React.useCallback(() => {
    stageRef.current = wrapper.current.getBoundingClientRect();
  }, []);


  //start perp edit
  //create function list
  var functionList = []
  for(let i in nodes){
    if(nodes[i].type === "function"){
      functionList.push(nodes[i])
    }
  }

  var variableList = []
  for(let i in nodes){
    if(nodes[i].type === "set variable"){
      variableList.push(nodes[i])
    }
  }  
  //end perp edit

  React.useEffect(() => {
    stageRef.current = wrapper.current.getBoundingClientRect();
    window.addEventListener("resize", setStageRect);
    return () => {
      window.removeEventListener("resize", setStageRect);
    };
  }, [stageRef, setStageRect]);

  const handleWheel = React.useCallback(
    e => {
      if (e.target.nodeName === "TEXTAREA" || e.target.dataset.comment) {
        if (e.target.clientHeight < e.target.scrollHeight) return;
      }
      e.preventDefault();
      if (numNodes === 0) return;
      dispatchStageState(({ scale: currentScale, translate: currentTranslate }) => {
        const delta = e.deltaY;
        const newScale = clamp(currentScale - clamp(delta, -10, 10) * 0.005, 0.1, 7);

        const byOldScale = (no) => no * (1 / currentScale);
        const byNewScale = (no) => no * (1 / newScale);

        const wrapperRect = wrapper.current.getBoundingClientRect();

        const xOld = byOldScale(e.clientX - wrapperRect.x - wrapperRect.width / 2 + currentTranslate.x);
        const yOld = byOldScale(e.clientY - wrapperRect.y - wrapperRect.height / 2 + currentTranslate.y);

        const xNew = byNewScale(e.clientX - wrapperRect.x - wrapperRect.width / 2 + currentTranslate.x);
        const yNew = byNewScale(e.clientY - wrapperRect.y - wrapperRect.height / 2 + currentTranslate.y);

        const xDistance = xOld - xNew;
        const yDistance = yOld - yNew;


        return {
          type: "SET_TRANSLATE_SCALE",
          scale: newScale,
          translate: {
            x: currentTranslate.x + xDistance * newScale,
            y: currentTranslate.y + yDistance * newScale
          }
        }
      });

    },
    [dispatchStageState, numNodes]
  );

  const handleDragDelayStart = e => {
    wrapper.current.focus();
  };

  const handleDragStart = e => {
    e.preventDefault();
    dragData.current = {
      x: e.clientX,
      y: e.clientY
    };
  };

  const handleMouseDrag = (coords, e) => {
    const xDistance = dragData.current.x - e.clientX;
    const yDistance = dragData.current.y - e.clientY;
    const xDelta = translate.x + xDistance;
    const yDelta = translate.y + yDistance;
    wrapper.current.style.backgroundPosition = `${-xDelta}px ${-yDelta}px`;
    translateWrapper.current.style.transform = `translate(${-(
      translate.x + xDistance
    )}px, ${-(translate.y + yDistance)}px)`;
  };

  const handleDragEnd = e => {
    const xDistance = dragData.current.x - e.clientX;
    const yDistance = dragData.current.y - e.clientY;
    dragData.current.x = e.clientX;
    dragData.current.y = e.clientY;
    dispatchStageState(({ translate: tran }) => ({
      type: "SET_TRANSLATE",
      translate: {
        x: tran.x + xDistance,
        y: tran.y + yDistance
      }
    }));
  };

  const handleContextMenu = e => {
    e.preventDefault();
    setMenuCoordinates({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
    return false;
  };

  const closeContextMenu = () => {
    setMenuOpen(false);
    //start perp edit
    setMenuOptions(menuOptionsStage1stRight)
    //end perp edit
  };

  const byScale = value => (1 / scale) * value;

  

  const addNode = ({ node, internalType }) => {
    const wrapperRect = wrapper.current.getBoundingClientRect();
    const x =
      byScale(menuCoordinates.x - wrapperRect.x - wrapperRect.width / 2) +
      byScale(translate.x);
    const y =
      byScale(menuCoordinates.y - wrapperRect.y - wrapperRect.height / 2) +
      byScale(translate.y);

    if (internalType === "comment") {
      //start perp edit
      setMenuOpen(false);
      setMenuOptions(menuOptionsStage1stRight)
      //end perp edit
      dispatchComments({
        type: "ADD_COMMENT",
        x,
        y
      });

      //start perp edit
      //When new option on context menu is clicked
    } else if(internalType === "get_variable") {

      let variableNameList = []
      for(let i in variableList){
        //console.log(variableList)
        variableNameList.push({label: variableList[i].inputData.variableName.string, value: variableList[i].inputData.variableName.string, description: "", sortIndex: i, node: {label: "get variable " + variableList[i].inputData.variableName.string, value: "get variable " + variableList[i].inputData.variableName.string, details: variableList[i] }})
      }

      setMenuOptions(variableNameList)

    } else if(internalType === "call_function") {
      
      
      let functionNameList = []
      for(let i in functionList){
        functionNameList.push({label: functionList[i].inputData.functionName.string, value: functionList[i].inputData.functionName.string, description: "", sortIndex: i, node: {label: "call function " + functionList[i].inputData.functionName.string, value: "call function " + functionList[i].inputData.functionName.string, details: functionList[i] }})
      }
      setMenuOptions(functionNameList)



    } else if(node.label.startsWith("call function ")) {
      
      //console.log("create CALL_FUNCTION node :", node.details)

      dispatchNodes({
        type: "ADD_CALL_FUNCTION_NODE",
        x,
        y,
        nodeType: node.details
      });

      setMenuOptions(menuOptionsStage1stRight)
      setMenuOpen(false);
      

    } else if(node.label.startsWith("get variable ")) {
      
      //console.log("create GET_VARIABLE node :", node.details)
     
      dispatchNodes({
        type: "ADD_GET_VARIABLE_NODE",
        x,
        y,
        nodeType: node.details
      });

      setMenuOptions(menuOptionsStage1stRight)
      setMenuOpen(false);


      //end perp edit

    } else {

      //start perp edit
      setMenuOpen(false);
      setMenuOptions(menuOptionsStage1stRight)

      //console.log("create this node", node)

      //end perp edit
      dispatchNodes({
        type: "ADD_NODE",
        x,
        y,
        nodeType: node.type
      });
    }
  };

  const handleDocumentKeyUp = e => {
    if (e.which === 32) {
      setSpaceIsPressed(false);
      document.removeEventListener("keyup", handleDocumentKeyUp);
    }
  };

  const handleKeyDown = e => {
    if (e.which === 32 && document.activeElement === wrapper.current) {
      e.preventDefault();
      e.stopPropagation();
      setSpaceIsPressed(true);
      document.addEventListener("keyup", handleDocumentKeyUp);
    }
  };

  const handleMouseEnter = () => {
    if (!wrapper.current.contains(document.activeElement)) {
      wrapper.current.focus();
    }
  };

  React.useEffect(() => {
    if (!disableZoom) {
      let stageWrapper = wrapper.current;
      stageWrapper.addEventListener("wheel", handleWheel);
      return () => {
        stageWrapper.removeEventListener("wheel", handleWheel);
      };
    }
  }, [handleWheel, disableZoom]);
      
  return (
    <Draggable
      data-flume-component="stage"
      id={`${STAGE_ID}${editorId}`}
      className={styles.wrapper}
      innerRef={wrapper}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onDragDelayStart={handleDragDelayStart}
      onDragStart={handleDragStart}
      onDrag={handleMouseDrag}
      onDragEnd={handleDragEnd}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      stageState={{ scale, translate }}
      style={{ cursor: spaceIsPressed && spaceToPan ? "grab" : "" }}
      disabled={disablePan || (spaceToPan && !spaceIsPressed)}
      data-flume-stage={true}
    >
      {menuOpen ? (
        <Portal>
          <ContextMenu
            x={menuCoordinates.x}
            y={menuCoordinates.y}
            options={menuOptions}
            onRequestClose={closeContextMenu}
            onOptionSelected={addNode}
            label="Add Node"
          />
        </Portal>
      ) : null}
      <div
        ref={translateWrapper}
        className={styles.transformWrapper}
        style={{ transform: `translate(${-translate.x}px, ${-translate.y}px)` }}
      >
        <div
          className={styles.scaleWrapper}
          style={{ transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
      {outerStageChildren}
    </Draggable>
  );
};
export default Stage;
