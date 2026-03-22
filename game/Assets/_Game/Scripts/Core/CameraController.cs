using UnityEngine;

public class CameraController : MonoBehaviour
{
    [SerializeField] private float strategicZoom = 8f;
    [SerializeField] private float actionZoom = 3f;
    [SerializeField] private float zoomSpeed = 5f;
    [SerializeField] private float panSpeed = 10f;
    [SerializeField] private float minZoom = 2f;
    [SerializeField] private float maxZoom = 12f;

    private Camera _camera;
    private float _targetZoom;
    private Vector3 _targetPosition;
    private bool _isDragging;
    private Vector3 _lastPanPosition;
    private Vector3 _boardCenter;

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
        if (Input.touchCount != 2)
            return;

        Touch t0 = Input.GetTouch(0);
        Touch t1 = Input.GetTouch(1);

        Vector2 t0Prev = t0.position - t0.deltaPosition;
        Vector2 t1Prev = t1.position - t1.deltaPosition;

        float prevDist = Vector2.Distance(t0Prev, t1Prev);
        float currDist = Vector2.Distance(t0.position, t1.position);
        float delta = prevDist - currDist;

        _targetZoom += delta * 0.01f;
        _targetZoom = Mathf.Clamp(_targetZoom, minZoom, maxZoom);
    }

    private void HandlePan()
    {
        // Mobile single-finger pan
        if (Input.touchCount == 1)
        {
            Touch touch = Input.GetTouch(0);

            if (touch.phase == TouchPhase.Began)
            {
                _lastPanPosition = touch.position;
                _isDragging = true;
            }
            else if (touch.phase == TouchPhase.Moved && _isDragging)
            {
                Vector3 delta = touch.position - (Vector2)_lastPanPosition;
                _targetPosition -= delta * (panSpeed * _camera.orthographicSize * 0.0001f);
                _lastPanPosition = touch.position;
            }
            else if (touch.phase == TouchPhase.Ended || touch.phase == TouchPhase.Canceled)
            {
                _isDragging = false;
            }
        }

        // Mouse drag for editor testing
        if (Input.GetMouseButtonDown(0))
        {
            _lastPanPosition = Input.mousePosition;
            _isDragging = true;
        }
        else if (Input.GetMouseButton(0) && _isDragging)
        {
            Vector3 delta = Input.mousePosition - _lastPanPosition;
            _targetPosition -= delta * (panSpeed * _camera.orthographicSize * 0.0001f);
            _lastPanPosition = Input.mousePosition;
        }
        else if (Input.GetMouseButtonUp(0))
        {
            _isDragging = false;
        }
    }
}
