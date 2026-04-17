package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"

	"github.com/go-redis/redis/v8"
)

var ctx = context.Background()

// make stucher to read the json data from node.js server
type JobData struct {
	URL     string `json:"url"`
	Quality string `json:"quality"`
}

func main() {
	rdb := redis.NewClient(&redis.Options{
		Addr: "redis:6379",
	})

	fmt.Println(" Go Worker started,weiting for link...")

	for {
		result, err := rdb.BRPop(ctx, 0, "video_queue").Result()
		if err != nil {
			continue
		}

		// json work understand to go file
		jobString := result[1]
		var job JobData
		json.Unmarshal([]byte(jobString), &job)

		fmt.Printf(" URL: %s | Quality: %s\n", job.URL, job.Quality)

		// 3. Quality find the format code for yt-dlp
		formatCode := "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
		if job.Quality == "720p" {
			formatCode = "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
		} else if job.Quality == "480p" {
			formatCode = "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
		} else if job.Quality == "audio" {
			formatCode = "bestaudio[ext=m4a]/bestaudio"
		}

		// download the video using yt-dlp with the format code
		cmd := exec.Command("yt-dlp",
			"-f", formatCode,
			"--merge-output-format", "mp4",
			"-o", "/downloads/%(title)s.%(ext)s",
			job.URL)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		err = cmd.Run()
		if err != nil {
			fmt.Println(" Error:", err)
		} else {
			fmt.Println("vedio downlode and save succsesful!")
		}
	}
}
