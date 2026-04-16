package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"

	"github.com/go-redis/redis/v8"
)

var ctx = context.Background()

func main() {
	// 1. Redis conection to docker container
	rdb := redis.NewClient(&redis.Options{
		Addr: "redis:6379",
	})

	fmt.Println("start work! weiting for link...")

	// 2.  Redis see to the loop(finite Loop)
	for {
		// "video_queue" weit ing for link and when link come it will pop the link from the queue
		result, err := rdb.BRPop(ctx, 0, "video_queue").Result()
		if err != nil {
			continue
		}

		// come the link from the queue and save in videoURL variable
		videoURL := result[1]
		fmt.Println("new link Downloading:", videoURL)

		// 3. yt-dlp dowinload the video from the link and save in the current directory
		cmd := exec.Command("yt-dlp", "-f", "bestvideo[height<=1080]+bestaudio/best", "--merge-output-format", "mp4", videoURL)

		// Terminal showing progress
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		err = cmd.Run()
		if err != nil {
			fmt.Println(" Error :", err)
		} else {
			fmt.Println("vedio downlode sucsusfully Merged !")
		}
	}
}
