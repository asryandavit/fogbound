using System.Collections;
using UnityEngine;

public class ExplorerController : MonoBehaviour
{
    [SerializeField] private GameObject model3D;
    [SerializeField] private SpriteRenderer token2D;
    [SerializeField] private Animator animator;
    [SerializeField] private float moveSpeed = 5f;
    [SerializeField] private Color teamColor = Color.white;

    private ExplorerData _explorerData;
    private bool _is3DMode = true;

    public ExplorerData ExplorerData => _explorerData;
    public bool Is3DMode => _is3DMode;

    /// <summary>
    /// Initializes this explorer with the given data and team color, then applies visuals.
    /// </summary>
    /// <param name="data">The explorer's runtime data.</param>
    /// <param name="color">The team color to apply to this explorer's visuals.</param>
    public void Initialize(ExplorerData data, Color color)
    {
        _explorerData = data;
        teamColor = color;
        ApplyTeamColor();
        ApplyRenderMode(_is3DMode);
    }

    /// <summary>
    /// Switches between 3D model and 2D token rendering modes.
    /// </summary>
    /// <param name="is3D">True to show the 3D model; false to show the 2D token.</param>
    public void ApplyRenderMode(bool is3D)
    {
        _is3DMode = is3D;
        if (model3D != null)
            model3D.SetActive(is3D);
        if (token2D != null)
            token2D.enabled = !is3D;
    }

    /// <summary>
    /// Toggles between 3D model and 2D token rendering.
    /// </summary>
    public void Toggle3DMode()
    {
        ApplyRenderMode(!_is3DMode);
    }

    /// <summary>
    /// Smoothly moves the explorer to the target grid position over time.
    /// Updates explorer state to Moving during transit and Idle on arrival.
    /// </summary>
    /// <param name="targetPosition">The destination grid position.</param>
    public IEnumerator MoveTo(Vector2Int targetPosition)
    {
        _explorerData.state = ExplorerState.Moving;

        Vector3 worldTarget = new Vector3(targetPosition.x, targetPosition.y, transform.position.z);

        while (Vector3.Distance(transform.position, worldTarget) > 0.01f)
        {
            transform.position = Vector3.MoveTowards(transform.position, worldTarget, moveSpeed * Time.deltaTime);
            yield return null;
        }

        transform.position = worldTarget;
        _explorerData.gridPosition = targetPosition;
        _explorerData.state = ExplorerState.Idle;
    }

    /// <summary>
    /// Triggers an animation by name on the 3D model's Animator. Only works in 3D mode.
    /// </summary>
    /// <param name="triggerName">The name of the Animator trigger parameter to set.</param>
    public void PlayAnimation(string triggerName)
    {
        if (animator == null || !_is3DMode)
            return;
        animator.SetTrigger(triggerName);
    }

    /// <summary>
    /// Marks this explorer as selected or deselected, updating its visual highlight.
    /// </summary>
    /// <param name="selected">True to show selected state; false to deselect.</param>
    public void SetSelected(bool selected)
    {
        // TODO: add selection ring or glow effect
    }

    private void ApplyTeamColor()
    {
        if (token2D != null)
            token2D.color = teamColor;
        // TODO: apply color to 3D model material
    }
}
