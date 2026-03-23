import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SubQuantityInput } from "../SubQuantityInput";

function Harness(props: { min?: number; max?: number; onLimitHit?: () => void }) {
  const [value, setValue] = React.useState(0);

  return (
    <SubQuantityInput
      value={value}
      onChange={setValue}
      min={props.min ?? 0}
      max={props.max ?? 3}
      onLimitHit={props.onLimitHit}
      testId="subqty"
    />
  );
}

describe("SubQuantityInput", () => {
  it("clamps typed values to max and triggers onLimitHit", () => {
    const onLimitHit = vi.fn();
    render(<Harness max={3} onLimitHit={onLimitHit} />);

    fireEvent.change(screen.getByTestId("subqty-input"), { target: { value: "9" } });

    expect((screen.getByTestId("subqty-input") as HTMLInputElement).value).toBe("3");
    expect(onLimitHit).toHaveBeenCalledTimes(1);
  });

  it("calls onLimitHit when incrementing at max", () => {
    const onLimitHit = vi.fn();
    render(<Harness max={1} onLimitHit={onLimitHit} />);

    fireEvent.change(screen.getByTestId("subqty-input"), { target: { value: "1" } });
    fireEvent.click(screen.getByTestId("subqty-inc"));

    expect((screen.getByTestId("subqty-input") as HTMLInputElement).value).toBe("1");
    expect(onLimitHit).toHaveBeenCalled();
  });
});
