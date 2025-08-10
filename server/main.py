import asyncio
import json
import os
import signal
import weakref
from datetime import datetime

from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed, WebSocketException

connected_clients = weakref.WeakSet()
active_connections = set()

MARKERS_FILE = "markers.json"
shutdown_event = asyncio.Event()


def load_markers():
    """Load existing markers from JSON file"""
    if os.path.exists(MARKERS_FILE):
        try:
            with open(MARKERS_FILE, "r", encoding="utf8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    return []


def save_markers(markers):
    """Save markers to JSON file"""
    try:
        with open(MARKERS_FILE, "w", encoding="utf8") as f:
            json.dump(markers, f, indent=2)
    except Exception as e: # pylint: disable=W0718
        print(f"Error saving markers: {e}")


async def broadcast_to_clients(message, exclude_client=None):
    """Broadcast a message to all connected clients except the excluded one"""
    if not active_connections:
        return

    clients_to_notify = active_connections.copy()
    if exclude_client:
        clients_to_notify.discard(exclude_client)

    if not clients_to_notify:
        return

    print(f"Broadcasting to {len(clients_to_notify)} clients")

    # send to all clients concurrently
    tasks = []
    for client in clients_to_notify:
        tasks.append(send_safe(client, message))

    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        successful = sum(1 for result in results if result is True)
        print(f"Successfully broadcast to {successful}/{len(tasks)} clients")


async def send_safe(websocket, message):
    """Safely send a message to a websocket, handling disconnections"""
    try:
        await websocket.send(message)
        return True
    except (ConnectionClosed, WebSocketException) as e:
        print(f"Connection closed when sending to client {id(websocket)}: {e}")
        active_connections.discard(websocket)
        return False
    except Exception as e: # pylint: disable=W0718
        print(f"Error sending to client {id(websocket)}: {e}")
        active_connections.discard(websocket)
        return False


async def handle_client(websocket):
    """Handle a new WebSocket client connection"""
    client_id = id(websocket)
    active_connections.add(websocket)
    connected_clients.add(websocket)
    print(f"New client {client_id} connected. Total clients: {len(active_connections)}")

    try:
        # send existing markers to the new client
        markers = load_markers()
        for marker in markers:
            message = {"type": "text", "value": json.dumps(marker)}
            success = await send_safe(websocket, json.dumps(message))
            if not success:
                print(f"Failed to send initial markers to client {client_id}")
                break

        # handle incoming messages
        async for message in websocket:
            try:
                data = json.loads(message)

                if data.get("eventType") == "addMarker":
                    required_fields = ["name", "description", "lat", "lon"]
                    if all(field in data for field in required_fields):
                        marker = {
                            "eventType": "addMarker",
                            "name": data["name"],
                            "description": data["description"],
                            "lat": data["lat"],
                            "lon": data["lon"],
                            "timestamp": datetime.now().isoformat(),
                        }

                        markers = load_markers()
                        markers.append(marker)
                        save_markers(markers)

                        message_to_send = {"type": "text", "value": json.dumps(marker)}

                        # broadcast to other clients
                        await broadcast_to_clients(
                            json.dumps(message_to_send), exclude_client=websocket
                        )

                        print(
                            f"New marker added: {marker['name']} at ({marker['lat']}, {marker['lon']})"
                        )
                    else:
                        print(
                            f"Invalid marker data received from client {client_id}: {data}"
                        )

            except json.JSONDecodeError:
                print(f"Invalid JSON received from client {client_id}: {message}")
            except Exception as e: # pylint: disable=W0718
                print(f"Error processing message from client {client_id}: {e}")

    except ConnectionClosed:
        print(f"Client {client_id} disconnected normally")
    except WebSocketException as e:
        print(f"WebSocket error for client {client_id}: {e}")
    except Exception as e:  # pylint: disable=W0718
        print(f"Client {client_id} connection error: {e}")
    finally:
        active_connections.discard(websocket)
        print(
            f"Client {client_id} disconnected. Total clients: {len(active_connections)}"
        )


def setup_signal_handlers():
    """Setup signal handlers for graceful shutdown"""

    def signal_handler(signum, _frame):
        print(f"Received signal {signum}, initiating shutdown...")
        shutdown_event.set()

    try:
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    except (AttributeError, ValueError):
        print("Signal handling not available on this platform")


async def main():
    """Main server function with graceful shutdown"""
    setup_signal_handlers()

    print("Starting WebSocket server on localhost:5000")

    try:
        async with serve(
            handle_client,
            "localhost",
            5000,
            close_timeout=10,
            max_size=10**6, # 1MB
            max_queue=32
        ) as _server:
            print("WebSocket server started successfully")

            try:
                await shutdown_event.wait()
            except KeyboardInterrupt:
                print("Received keyboard interrupt")
                shutdown_event.set()

    except Exception as e: # pylint: disable=W0718
        print(f"Server error: {e}")
    finally:
        print("Server shutting down...")
        # Close all active connections
        if active_connections:
            print(f"Closing {len(active_connections)} active connections...")
            close_tasks = []
            for websocket in list(active_connections):
                close_tasks.append(websocket.close(code=1001, reason="Server shutdown"))
            if close_tasks:
                await asyncio.gather(*close_tasks, return_exceptions=True)
        print("Server shutdown complete")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server interrupted by user")
