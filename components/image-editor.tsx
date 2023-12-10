import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';

import { Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import downloadPhoto from '@/lib/utils';
import CompareSlider from './compare-slider';


const ImageEditor = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [mask, setMask] = useState<string | null>(null);
    const [drawing, setDrawing] = useState<boolean>(false);
    const [originalImageDataUrl, setOriginalImageDataUrl] = useState<string | null>(null);
    const [maskDataUrl, setMaskDataUrl] = useState<string | null>(null);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>("");
    const [canvasWidth, setCanvasWidth] = useState<number | null>(null);
    const [canvasHeight, setCanvasHeight] = useState<number | null>(null);
    const [isBlockingMultipleCalls, setIsBlockingMultipleCalls] = useState<boolean>(false);
    const [spinner, setSpinner] = useState<boolean>(false);
    const inputRef = useRef<null | HTMLInputElement>();
    const predictVideo_url = `/api/toVideo`;

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {

        if (!event.target.files?.[0]) return;
        const file = event.target.files?.[0];
        const fileType = file.type;
        if (!['image/jpeg', 'image/png'].includes(fileType)) {
            alert("Invalid file format. Please upload a JPG or PNG file.")
            return;
        }

        //reset the url of the generated image to hide the download buttons and comparator
        setGeneratedImageUrl(null);


        //reset img input so user can select the same image as before.
        event.target.value = "";

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            const img = new window.Image();
            img.onload = () => {
                setImage(img);
                setMask(null); // clear the mask when a new image is uploaded
                setGeneratedImageUrl(null);
                setSpinner(false);
            };
            img.src = e.target?.result as string;
            console.log(img.naturalHeight);
        };
        reader?.readAsDataURL(file as Blob);

    };

    const handleMouseDown = () => {
        setDrawing(true);
        if (canvasRef.current) {
            canvasRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
        }
    };

    const handleTouchStart = (event: TouchEvent) => {
        event.preventDefault();
    };

    const handleMouseUp = () => {
        setDrawing(false);
        if (canvasRef.current) {
            canvasRef.current.removeEventListener('touchstart', handleTouchStart);
        }
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent> | React.TouchEvent<HTMLCanvasElement>) => {
        if ('preventDefault' in event) {
            event.preventDefault();
        }
        let x: number, y: number;

        if ('offsetX' in event.nativeEvent) {
            x = event.nativeEvent.offsetX;
            y = event.nativeEvent.offsetY;
        } else if ('touches' in event.nativeEvent) {
            const canvas = canvasRef.current;
            const touch = event.nativeEvent.touches[0];
            const rect = canvas?.getBoundingClientRect();
            if (canvas && rect) {
                x = touch.clientX - rect.left;
                y = touch.clientY - rect.top;
            }
        }

        if (drawing && canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            const radius = 10; // Set the radius of the circle cursor here
            if (context) {
                context.beginPath();
                context.arc(x, y, radius, 0, Math.PI * 2);
                context.fillStyle = "rgba(0, 0, 0, 1)";
                context.fill();
                const dataURL = canvas.toDataURL();
                setMask(dataURL);
            }
        }

    };

    const handleReset = () => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                setMask(null);
            }
        }
    };

    const prepareMask = async () => {
        if (mask && image) {
            handleReset();
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
                canvas.width = imageRef?.current?.clientWidth!!;
                canvas.height = imageRef?.current?.clientHeight!!;

                // Fill the canvas with black color
                context.fillStyle = "white";
                context.fillRect(0, 0, canvas.width, canvas.height);

                // We need to send the mask as a white image with white area to be modified
                // Draw the mask area on the canvas with black color
                const maskImage = new window.Image();
                maskImage.src = mask;
                maskImage.onload = async () => {
                    context.globalCompositeOperation = "destination-out";
                    context.drawImage(maskImage, 0, 0);
                    context.globalCompositeOperation = "destination-over";
                    context.fillStyle = "black";
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    const dataURL = canvas.toDataURL();
                    try {
                        setMaskDataUrl(dataURL);
                        setIsBlockingMultipleCalls(true);


                    } catch (error) {
                        console.log(error);
                    }
                };
            }
        }
    };

    const handleOnSubmit = async () => {
        setSpinner(true);

        //resizing image to current size on screen https://codesalad.dev/blog/how-to-resize-an-image-in-10-lines-of-javascript-29
        // Initialize the canvas and it's size
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set width and height
        if (!imageRef || !imageRef.current) {
            alert("please select a new image");
            return;
        }
        canvas.width = imageRef.current.clientWidth;
        canvas.height = imageRef.current.clientHeight;

        // Draw image and export to a data-uri
        ctx?.drawImage(image, 0, 0, canvas.width, canvas.height);

        const originalImageDataUrl = canvas.toDataURL('png', 1)

        setOriginalImageDataUrl(originalImageDataUrl);
        prepareMask();
    }


    const handleOnLoadImage = (event: any) => {

        const { clientHeight, clientWidth } = event.target;
        setCanvasWidth(clientWidth);
        setCanvasHeight(clientHeight);

    }

    const generateImage = useCallback(async () => {

        if (originalImageDataUrl && maskDataUrl && isBlockingMultipleCalls) {

            const body = {
                originalImageDataUrl: originalImageDataUrl,
                maskDataUrl: maskDataUrl,
                prompt: prompt
            }
            //upload image and mask and get the urls then call generate 
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify(body)
            });

            let responseCompleted = await response.json();
            setIsBlockingMultipleCalls(false);
            setSpinner(false);
            setGeneratedImageUrl(responseCompleted.generated);
        }

    }, [isBlockingMultipleCalls, maskDataUrl, originalImageDataUrl])

    const triggerFileSelectPopup = () => inputRef?.current?.click();

    useEffect(() => {

        // making the canvas responsive after multiple attemps this seems to work
        const handleResize = () => {
            if (imageRef.current && imageRef.current.complete) {
                setCanvasWidth(imageRef.current.clientWidth);
                setCanvasHeight(imageRef.current.clientHeight);
                // handleReset(); on mobile reset the canvas on every scroll
            }
        }
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };

    }, [image]);

    useEffect(() => {

        if (maskDataUrl && originalImageDataUrl) {
            handleMakeVideo();
        }

    }, [maskDataUrl, originalImageDataUrl, isBlockingMultipleCalls, generateImage])


    const handleMakeVideo = async () => {
        try {
            const result: any = await fetch(predictVideo_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ img: originalImageDataUrl, mask: maskDataUrl }),
            });

            if (!result.ok) {
                console.log(result.status);
                throw new Error("HTTP error!");
            }

            const resultData = await result.json();

            setGeneratedImageUrl(resultData.image.url);
            setSpinner(false);
            setIsBlockingMultipleCalls(false)

        } catch (error: any) {
            console.error("Error:", error.message);
        }
    };


    return (
        <div className="relative w-full pb-4" >
            <div className="mb-6 flex">
                <Input type="file" accept=".jpg,.jpeg,.png" onChange={handleImageUpload} className="hidden" ref={inputRef as any} />
                <Button onClick={triggerFileSelectPopup} className="flex-auto" disabled={spinner}>
                    Upload an image
                </Button>
            </div>

            {generatedImageUrl && (
                <CompareSlider
                    original={originalImageDataUrl!}
                    generated={generatedImageUrl!}
                />
            )}
            {(image && !generatedImageUrl) && (
                <div className="relative">
                    <Image src={image.src} alt="uploaded" width={image.naturalWidth} height={image.naturalHeight} ref={imageRef} onLoad={(event) => { handleOnLoadImage(event) }} className={spinner ? "blur-lg" : ''} />

                    <canvas
                        ref={canvasRef}
                        width={canvasWidth}
                        height={canvasHeight}
                        style={{ position: 'absolute', top: 0, left: 0, cursor: 'pointer' }}
                        className={spinner ? "absolute top-0 left-0 cursor-pointer blur-lg" : "absolute top-0 left-0 cursor-pointer"}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        onTouchStart={handleMouseDown}
                        onTouchEnd={handleMouseUp}
                        onTouchMove={handleMouseMove}
                    />
                </div>
            )}

            {
                image && (
                    <>
                        <div className="my-6">
                            <Button onClick={handleReset} className="mr-4" disabled={!mask || spinner}>Reset mask</Button>
                            {
                                generatedImageUrl && (
                                    <Button onClick={() => { downloadPhoto(generatedImageUrl, 'new-SnapFix') }} className="mr-4" >Download image</Button>
                                )
                            }
                        </div>
                        <div className="grid w-full gap-4 ">
                            <Button onClick={handleOnSubmit} disabled={spinner}>
                                {isBlockingMultipleCalls && (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait
                                    </>
                                )}
                                {
                                    !isBlockingMultipleCalls && (
                                        "Animate"

                                    )
                                }
                            </Button>

                        </div>
                    </>
                )
            }

        </div>
    );
};

export default ImageEditor;
