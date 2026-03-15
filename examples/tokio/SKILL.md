---
name: tokio
description: *[TokioConf 2026 program and tickets are now available!](https://tokioconf.com)* WHEN: make http requests. Triggers: use tokio, install tokio, how to use tokio, make http request.
---

# tokio

*[TokioConf 2026 program and tickets are now available!](https://tokioconf.com)*

## When to Use

- Make HTTP requests

## When NOT to Use

- Projects using Python or JavaScript (different ecosystem)

## Quick Start

### Install

```bash
cargo install tokio
```

### Basic Usage

```toml
[dependencies]
tokio = { version = "1.50.0", features = ["full"] }
```

```rust,no_run
use tokio::net::TcpListener;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;

    loop {
        let (mut socket, _) = listener.accept().await?;

        tokio::spawn(async move {
            let mut buf = [0; 1024];

            // In a loop, read data from the socket and write the data back.
            loop {
                let n = match socket.read(&mut buf).await {
                    // socket closed
                    Ok(0) => return,
                    Ok(n) => n,
                    Err(e) => {
                        eprintln!("failed to read from socket; err = {:?}", e);
                        return;
                    }
                };

                // Write the data back
                if let Err(e) = socket.write_all(&buf[0..n]).await {
                    eprintln!("failed to write to socket; err = {:?}", e);
                    return;
                }
            }
        });
    }
}
```

## Examples

A basic TCP echo server with Tokio.

Make sure you enable the full features of the tokio crate on Cargo.toml:


Then, on your main.rs:



More examples can be found [here][examples]. For a larger "real world" example, see the
[mini-redis] repository.

[examples]: https://github.com/tokio-rs/tokio/tree/master/examples
[mini-redis]: https://github.com/tokio-rs/mini-redis/

To see a list of the available feature flags that can be enabled, check our
[docs][feature-flag-docs].

## Project Info

- **Language:** Rust
- **Tests:** Yes

## File Structure

```
├── benches/
│   ├── Cargo.toml
│   ├── copy.rs
│   ├── fs.rs
│   ├── remote_spawn.rs
│   ├── rt_current_thread.rs
│   ├── rt_multi_threaded.rs
│   ├── signal.rs
│   ├── spawn_blocking.rs
│   ├── spawn.rs
│   ├── sync_broadcast.rs
│   ├── sync_mpsc_oneshot.rs
│   ├── sync_mpsc.rs
│   ├── sync_notify.rs
│   ├── sync_rwlock.rs
│   ├── sync_semaphore.rs
│   ├── sync_watch.rs
│   ├── time_now.rs
│   └── time_timeout.rs
├── docs/
```