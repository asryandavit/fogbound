using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using Touch = UnityEngine.InputSystem.EnhancedTouch.Touch;
using TouchPhase = UnityEngine.InputSystem.TouchPhase;

public class CameraController : MonoBehaviour
{
    [SerializeField] private float strategicZoom = 10f;
    [SerializeField] private float actionZoom = 3f;
    [SerializeField] private float zoomSpeed = 5f;
    [SerializeField] private float panSpeed = 10f;
    [SerializeField] private float minZoom = 2f;
    [SerializeField] private float maxZoom = 15f;

    private Camera _camera;
    private float _targetZoom;
    private Vector3 _targetPosition;
    private bool _isDragging;
    private Vector3 _lastPanPosition;
    private Vector3 _boardCenter;

    private void OnEnable()
    {
        EnhancedTouchSupport.Enable();
    }

    private void OnDisable()
    {
        EnhancedTouchSupport.Disable();
    }

    private void Start()
    {
        _camera = GetComponent<Camera>();
        _targetZoom = strategicZoom;
        _targetPosition = transform.position;
    }

    private void Update()
    {
        HandlePinchZoom();
        HandlePan();

        _camera.orthographicSize = Mathf.Lerp(_camera.orthographicSize, _targetZoom, Time.deltaTime * zoomSpeed);
        transform.position = Vector3.Lerp(transform.position, _targetPosition, Time.deltaTime * zoomSpeed);
    }

    /// <summary>
    /// Sets the board center used when returning to the strategic overview.
    /// </summary>
    /// <param name="center">The world-space center of the board.</param>
    public void SetBoardCenter(Vector3 center)
    {
        _boardCenter = center;
        _targetPosition = new Vector3(center.x, center.y, -10f);
    }

    /// <summary>
    /// Zooms in and pans the camera to focus on a specific tile.
    /// </summary>
    /// <param name="tileWorldPos">The world-space position of the tile to focus on.</param>
    public void FocusOnTile(Vector3 tileWorldPos)
    {
        _targetZoom = actionZoom;
        _targetPosition = new Vector3(tileWorldPos.x, tileWorldPos.y, -10f);
    }

    /// <summary>
    /// Returns the camera to the full-board strategic zoom centered on the board.
    /// </summary>
    public void ReturnToStrategicView()
    {
        _targetZoom = strategicZoom;
        _targetPosition = new Vector3(_boardCenter.x, _boardCenter.y, -10f);
    }

    private void HandlePinchZoom()
    {
        var activeTouches = Touch.activeTouches;
        if (activeTouches.Count != 2)
            return;

        var touch0 = activeTouches[0];
        var touch1 = activeTouches[1];

        Vector2 t0Prev = touch0.screenPosition - touch0.delta;
        Vector2 t1Prev = touch1.screenPosition - touch1.delta;

        float prevDist = Vector2.Distance(t0Prev, t1Prev);
        float currDist = Vector2.Distance(touch0.screenPosition, touch1.screenPosition);
        float delta = prevDist - currDist;

        _targetZoom += delta * 0.01f;
        _targetZoom = Mathf.Clamp(_targetZoom, minZoom, maxZoom);
    }

    private void HandlePan()
    {
        var activeTouches = Touch.activeTouches;

        // Mobile single-finger pan
        if (activeTouches.Count == 1)
        {
            var touch0 = activeTouches[0];

            if (touch0.phase == TouchPhase.Began)
            {
                _lastPanPosition = (Vector3)touch0.screenPosition;
                _isDragging = true;
            }
            else if (touch0.phase == TouchPhase.Moved && _isDragging)
            {
                Vector3 delta = (Vector3)touch0.screenPosition - _lastPanPosition;
                _targetPosition -= delta * (panSpeed * _camera.orthographicSize * 0.0001f);
                _lastPanPosition = (Vector3)touch0.screenPosition;
            }
            else if (touch0.phase == TouchPhase.Ended || touch0.phase == TouchPhase.Canceled)
            {
                _isDragging = false;
            }
        }

        // Mouse drag for editor testing
        var mouse = Mouse.current;
        if (mouse == null)
            return;

        if (mouse.leftButton.wasPressedThisFrame)
        {
            _lastPanPosition = (Vector3)mouse.position.ReadValue();
            _isDragging = true;
        }
        else if (mouse.leftButton.isPressed && _isDragging)
        {
            Vector3 currentMousePos = (Vector3)mouse.position.ReadValue();
            Vector3 delta = currentMousePos - _lastPanPosition;
            _targetPosition -= delta * (panSpeed * _camera.orthographicSize * 0.0001f);
            _lastPanPosition = currentMousePos;
        }
        else if (mouse.leftButton.wasReleasedThisFrame)
        {
            _isDragging = false;
        }
    }
}
