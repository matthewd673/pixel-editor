class MoveSelectionTool extends Tool {
    currSelection = undefined;
    selectionTool = undefined;
    endTool = undefined;
    switchFunc = undefined;
    lastCopiedSelection = undefined;

    constructor (name, options, switchFunc, endTool) {
        super(name, options, switchFunc);

        this.switchFunc = switchFunc;
        this.endTool = endTool;

        Events.onCustom("esc-pressed", this.endSelection.bind(this));

        Events.onCustom("ctrl+c", this.copySelection.bind(this));
        Events.onCustom("ctrl+x", this.cutSelection.bind(this));
        Events.onCustom("ctrl+v", this.pasteSelection.bind(this));
    }

    copySelection() {
        this.lastCopiedSelection = this.currSelection;
    }

    cutSelection() {
        this.lastCopiedSelection = this.currSelection;
        this.endSelection();
        this.currSelection = this.lastCopiedSelection;
        // Cut the data
        currentLayer.context.clearRect(this.currSelection.left, this.currSelection.top,
            this.currSelection.width, this.currSelection.height);
    }

    pasteSelection() {
        if (this.lastCopiedSelection === undefined)
            return;
        // Finish the current selection and start a new one with the same data
        this.endSelection();
        this.switchFunc(this);
        this.currSelection = this.lastCopiedSelection;

        // Putting the vfx layer on top of everything
        VFXLayer.canvas.style.zIndex = MAX_Z_INDEX;
        this.onDrag(this.currMousePos);

        new HistoryState().EditCanvas();
    }

    onStart(mousePos) {
        super.onStart(mousePos);

        if (!this.cursorInSelectedArea(mousePos)) {
            this.endSelection();
        }
    }

    onDrag(mousePos) {
        super.onDrag(mousePos);

        this.currSelection = this.selectionTool.moveAnts(mousePos[0]/zoom, 
            mousePos[1]/zoom, this.currSelection.width, this.currSelection.height);

        // clear the entire tmp layer
        TMPLayer.context.clearRect(0, 0, TMPLayer.canvas.width, TMPLayer.canvas.height);
        // put the image data on the tmp layer with offset
        TMPLayer.context.putImageData(
            this.currSelection.data, 
            Math.round(mousePos[0] / zoom) - this.currSelection.width / 2, 
            Math.round(mousePos[1] / zoom) - this.currSelection.height / 2);
    }

    onEnd(mousePos) {
        super.onEnd(mousePos);
    }

    onSelect() {
        super.onSelect();
    }

    onDeselect() {
        super.onDeselect();
    }

    setSelectionData(data, tool) {
        this.currSelection = data;
        this.selectionTool = tool;
        this.firstTimeMove = true;
    }

    onHover(mousePos) {
        super.onHover(mousePos);

        if (this.cursorInSelectedArea(mousePos)) {
            canvasView.style.cursor = 'move';
        }
        else {
            canvasView.style.cursor = 'default';
        }
    }

    cursorInSelectedArea(cursorPos) {        
        // Getting the coordinates relatively to the canvas
        let x = cursorPos[0] / zoom;
        let y = cursorPos[1] / zoom;
    
        if (this.currSelection.left <= x && x <= this.currSelection.right) {
            if (y <= this.currSelection.bottom && y >= this.currSelection.top) {
                return true;
            }
            return false;
        }
        return false;
    }    

    endSelection() {
        if (this.currSelection == undefined)
            return;
        // Clearing the tmp (move preview) and vfx (ants) layers
        TMPLayer.context.clearRect(0, 0, TMPLayer.canvas.width, TMPLayer.canvas.height);
        VFXLayer.context.clearRect(0, 0, VFXLayer.canvas.width, VFXLayer.canvas.height);

        // I have to save the underlying data, so that the transparent pixels in the clipboard 
        // don't override the coloured pixels in the canvas
        let underlyingImageData = currentLayer.context.getImageData(
            this.currSelection.left, this.currSelection.top, 
            this.currSelection.width+1, this.currSelection.height+1
        );
        let pasteData = this.currSelection.data.data.slice();
        
        for (let i=0; i<underlyingImageData.data.length; i+=4) {
            let currentMovePixel = [
                pasteData[i], pasteData[i+1], pasteData[i+2], pasteData[i+3]
            ];

            let currentUnderlyingPixel = [
                underlyingImageData.data[i], underlyingImageData.data[i+1], 
                underlyingImageData.data[i+2], underlyingImageData.data[i+3]
            ];

            // If the pixel of the clipboard is empty, but the one below it isn't, I use the pixel below
            if (Util.isPixelEmpty(currentMovePixel)) {
                if (!Util.isPixelEmpty(currentUnderlyingPixel)) {
                    console.log("Original data: " + this.currSelection.data.data[i] + "," +
                    this.currSelection.data.data[i+1], this.currSelection.data.data[i+2]);

                    pasteData[i] = currentUnderlyingPixel[0];
                    pasteData[i+1] = currentUnderlyingPixel[1];
                    pasteData[i+2] = currentUnderlyingPixel[2];
                    pasteData[i+3] = currentUnderlyingPixel[3];

                    console.log("After data: " + this.currSelection.data.data[i] + "," +
                    this.currSelection.data.data[i+1], this.currSelection.data.data[i+2]);
                }
            }
        }

        currentLayer.context.putImageData(new ImageData(pasteData, this.currSelection.width+1),
            this.currSelection.left, this.currSelection.top
        );

        this.currSelection = undefined;
        currentLayer.updateLayerPreview();
        VFXLayer.canvas.style.zIndex = MIN_Z_INDEX;
        
        // Switch to brush
        this.switchFunc(this.endTool);
    }
}